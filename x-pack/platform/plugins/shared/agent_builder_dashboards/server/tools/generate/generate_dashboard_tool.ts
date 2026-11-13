/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getToolResultId,
  type BuiltinToolDefinition,
  type ModelProvider,
} from '@kbn/agent-builder-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

import {
  arrangeDashboardLayout,
  executeDashboardUpsert,
  getErrorMessage,
  hasValidNewDashboardMetadata,
  upsertDashboardSchema,
  type DashboardValidator,
} from '@kbn/dashboard-agent-authoring';
import { dashboardTools } from '../../../common';
import { createAttachmentDashboardStore } from './attachment_dashboard_store';
import type { DashboardReference } from './dashboard_store';
import { createControlFieldCapabilitiesResolver } from './resolvers/control_field_capabilities_resolver';
import { createEsqlControlColumnTypeResolver } from './resolvers/esql_control_column_type_resolver';
import { createLayoutArranger } from './layout_arranger';
import { createPanelResolver } from './resolvers/panel_resolver';
import {
  createSavedObjectDashboardStore,
  type SavedObjectDashboardStoreDeps,
} from './saved_object_dashboard_store';
import { applyDefaultDashboardTimeRange } from './time_range';

const newDashboardMetadataErrorMessage = 'New dashboards require a non-empty `title`.';

const getNoModelErrorMessage = (cause: string) =>
  `No AI connector is available (${cause}). This tool needs one to build panels and lay out the dashboard. Configure an AI connector in Kibana, or pass \`connector_id\` to \`tools/_execute\`.`;

const assertModelAvailable = async (modelProvider: ModelProvider): Promise<void> => {
  try {
    await modelProvider.getDefaultModel();
  } catch (error) {
    throw new Error(getNoModelErrorMessage(getErrorMessage(error)));
  }
};

const noDashboardCreatedErrorMessage =
  'No dashboard was created because none of the requested panels or controls could be added (see metadata.failures). Fix the failures and call again without dashboardId.';

const noControlsAddedErrorMessage =
  'No dashboard was created because none of the requested controls could be added: controls you add on your own are left out when their field is missing or does not suit the control. Add panels, or controls on suitable fields, and call again without dashboardId.';

/** Whether the dashboard has no panels and no controls. Empty sections do not count. */
const isEmptyDashboard = ({ panels, pinned_panels: pinnedPanels }: DashboardAttachmentData) =>
  panels.every((widget) => isSection(widget) && widget.panels.length === 0) &&
  (pinnedPanels ?? []).length === 0;

const generateDashboardSchema = lazySchema(() =>
  z.object({
    dashboardId: z
      .string()
      .max(256)
      .optional()
      .describe(
        '(optional) The id of the dashboard to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in. An unknown id is an error.'
      ),
    ...upsertDashboardSchema.shape,
    layout: z
      .string()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'The user\'s own arrangement or size request, in plain words, e.g. "make the table full width". Omit it otherwise: new, moved, and removed panels and sections are placed and sized automatically, so do not describe where your changes go. It arranges panels only within their section or the top level: to move a panel into or out of a section, set its `section` in `panels`.'
      ),
  })
);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getConfigTitle = (config: unknown): string | undefined =>
  typeof config === 'object' && config !== null && 'title' in config
    ? asString(config.title)
    : undefined;

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the store (referenced by id); the LLM only
 * ever sees this slim summary, so it never has to re-emit the heavy payload into a
 * follow-up tool call. Panel titles let it tell panels apart when their ids do not
 * describe them, and grids let it report where the layout step put panels.
 *
 * `authoringNotesByPanelId` holds the one-sentence note describing every chart
 * authored in this run, keyed by panel id. Panels that were not authored now
 * (or whose engine returned no note) simply have no `authoring_note`.
 */
const summarizeDashboard = (
  dashboardData: DashboardAttachmentData,
  authoringNotesByPanelId: Map<string, string>
) => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        y: widget.grid.y,
        ...(widget.collapsed ? { collapsed: true } : {}),
        panels: widget.panels.map((panel) => ({
          type: panel.type,
          id: panel.id,
          title: getConfigTitle(panel.config),
          grid: panel.grid,
          authoring_note: authoringNotesByPanelId.get(panel.id),
        })),
      };
    }
    return {
      type: widget.type,
      id: widget.id,
      title: getConfigTitle(widget.config),
      grid: widget.grid,
      authoring_note: authoringNotesByPanelId.get(widget.id),
    };
  }),
  controls: (dashboardData.pinned_panels ?? []).map(({ id, type, config }) => ({
    id: asString(id),
    type: asString(type),
    title: getConfigTitle(config),
  })),
});

export interface GenerateDashboardToolDeps {
  getDashboardValidator: () => Promise<DashboardValidator>;
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
  /** Whether the Dashboard app takes Lens panels in the Lens API format (Lens as code). */
  isLensApiFormatEnabled: () => Promise<boolean>;
  basePath: SavedObjectDashboardStoreDeps['basePath'];
}

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardUpsert} core with a `DashboardStore`:
 * the tool reads the prior dashboard from `dashboardId`, saves the result, and returns only a
 * reference and a compact summary, so the LLM never handles the full payload. Agent Builder
 * conversations store the dashboard as a `dashboard` attachment. Other callers, such as MCP and
 * `tools/_execute`, store it as a dashboard saved object.
 */
export const generateDashboardTool = ({
  getDashboardValidator,
  getDashboardClient,
  isLensApiFormatEnabled,
  basePath,
}: GenerateDashboardToolDeps): BuiltinToolDefinition<typeof generateDashboardSchema> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Create or update a dashboard by describing the desired changes, keyed by id.

Returns the dashboard's id plus a compact summary. Pass that id as \`dashboardId\` to edit the dashboard later.

- \`title\`, \`description\`, \`time_range\`: dashboard fields to set.
- \`sections\`: sections to create or update.
- \`panels\`: panels to create, edit, or move between sections, by id. To change a panel's kind, remove it and add a new panel with a new id.
- \`controls\`: filters pinned above the dashboard, to add or to replace by id.
- \`remove\`: ids of panels, sections, or controls to remove.
- \`layout\`: the user's own arrangement or size request. Omit it otherwise.

Changes are applied one by one: failed ones are listed in \`failures\` with the reason and the rest are kept, so resend only the failed ones (some controls are left out silently, see \`controls\`). Panel positions and sizes are set automatically. The result lists the ids the call created, updated and removed, so a mistyped id that created a new panel is visible.`,
    schema: generateDashboardSchema,
    tags: ['platform', 'dashboards'],
    annotations: {
      title: 'Generate dashboard',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async (
      { dashboardId, layout, ...upsert },
      {
        logger,
        attachments,
        events,
        esClient,
        modelProvider,
        callContext,
        savedObjectsClient,
        request,
        spaceId,
      }
    ) => {
      try {
        const isConversation = callContext.callSource === 'agent';
        // A conversation already runs on a model; other callers may have no connector at all.
        if (!isConversation) {
          await assertModelAvailable(modelProvider);
        }
        const store = isConversation
          ? createAttachmentDashboardStore({ attachments, events })
          : createSavedObjectDashboardStore({
              dashboardClient: await getDashboardClient(),
              savedObjectsClient,
              request,
              spaceId,
              basePath,
              lensApiFormat: await isLensApiFormatEnabled(),
            });

        const existing = dashboardId ? await store.load(dashboardId) : undefined;

        if (!existing && !hasValidNewDashboardMetadata(upsert)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const {
          dashboardData: validatedDashboardData,
          created,
          updated,
          removed,
          failures,
          panelAuthoringNotes,
        } = await executeDashboardUpsert({
          dashboardData: existing?.data,
          upsert,
          logger,
          resolvePanelContent: createPanelResolver({
            logger,
            modelProvider,
            events,
            esClient,
          }),
          resolveAttachmentPanel: store.resolveAttachmentPanel,
          resolveControlFieldCapabilities: createControlFieldCapabilitiesResolver({
            esClient: esClient.asCurrentUser,
          }),
          resolveEsqlControlColumnType: createEsqlControlColumnTypeResolver({
            esClient: esClient.asCurrentUser,
          }),
          validator: await getDashboardValidator(),
        });

        // The arranger checks its own output and writes only grids, so the result is not validated again.
        const { dashboardData: generatedDashboardData, failure: layoutFailure } =
          await arrangeDashboardLayout({
            originalPanels: existing?.data.panels ?? [],
            dashboardData: validatedDashboardData,
            instructions: layout,
            arrangeLayout: createLayoutArranger({ modelProvider }),
            logger,
          });
        if (layoutFailure) {
          failures.push(layoutFailure);
        }

        const toDashboardResult = (
          dashboardData: DashboardAttachmentData,
          reference: DashboardReference
        ) => ({
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                ...reference,
                dashboard: summarizeDashboard(
                  dashboardData,
                  new Map(
                    panelAuthoringNotes.map(({ panelId, authoringNote }) => [
                      panelId,
                      authoringNote,
                    ])
                  )
                ),
                created,
                updated,
                removed,
                failures: failures.length > 0 ? failures : undefined,
              },
            },
          ],
        });

        // None of the requested panels and controls were added, so nothing is persisted; the
        // failures reach the agent through the tool result. Controls the agent added on its own
        // are left out without a failure, so the failures can be empty.
        const requestedContent = (upsert.panels?.length ?? 0) + (upsert.controls?.length ?? 0) > 0;
        if (!existing && requestedContent && isEmptyDashboard(generatedDashboardData)) {
          logger.info('Dashboard was not created because none of the changes were applied');
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    failures.length > 0
                      ? noDashboardCreatedErrorMessage
                      : noControlsAddedErrorMessage,
                  metadata: { failures },
                },
              },
            ],
          };
        }
        if (existing && isEqual(generatedDashboardData, existing.data)) {
          logger.info('Dashboard was not updated because it did not change');
          return toDashboardResult(generatedDashboardData, existing.reference);
        }

        // Data-aware default time range computation
        const dashboardData = await applyDefaultDashboardTimeRange({
          dashboardData: generatedDashboardData,
          esClient,
          logger,
        });

        const reference = await store.save(dashboardData, existing);

        logger.info(`Dashboard payload ${existing ? 'updated' : 'generated'}`);

        return toDashboardResult(dashboardData, reference);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dashboard: ${errorMessage}`,
                metadata: { dashboardId },
              },
            },
          ],
        };
      }
    },
  };
};

const missingNewDashboardMetadataErrorResult = {
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: newDashboardMetadataErrorMessage,
      },
    },
  ],
};
