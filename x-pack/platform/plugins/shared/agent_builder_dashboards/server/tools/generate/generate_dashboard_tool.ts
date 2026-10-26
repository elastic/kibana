/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { IBasePath } from '@kbn/core/server';
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
import { createLayoutArranger } from './layout_arranger';
import { createPanelResolver } from './resolvers/panel_resolver';
import { createSavedObjectDashboardStore } from './saved_object_dashboard_store';
import { applyDefaultDashboardTimeRange } from './time_range';

const newDashboardMetadataErrorMessage = 'New dashboards require a non-empty `title`.';

const noDashboardCreatedErrorMessage =
  'No dashboard was created because none of the requested panels or controls could be added (see metadata.failures). Fix the failures and call again without dashboardId.';

const noControlsAddedErrorMessage =
  'No dashboard was created because none of the requested controls could be added: controls you add on your own are left out when their field is missing or does not suit the control. Add panels, or controls on suitable fields, and call again without dashboardId.';

/** Whether the dashboard has no panels and no controls. Empty sections do not count. */
const isEmptyDashboard = ({ panels, pinned_panels: pinnedPanels }: DashboardAttachmentData) =>
  panels.every((widget) => isSection(widget) && widget.panels.length === 0) &&
  (pinnedPanels ?? []).length === 0;

const generateDashboardSchema = z.object({
  dashboardId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) The id returned by a previous call, to edit that dashboard. Omit to create a new dashboard. The tool reads the current dashboard from this id, so you never pass the full dashboard back in.'
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
});

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the store (referenced by id); the LLM only
 * ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call. Grids let it report where the layout step put panels.
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
          grid: panel.grid,
          authoring_note: authoringNotesByPanelId.get(panel.id),
        })),
      };
    }
    return {
      type: widget.type,
      id: widget.id,
      grid: widget.grid,
      authoring_note: authoringNotesByPanelId.get(widget.id),
    };
  }),
  controls: (dashboardData.pinned_panels ?? []).map(({ id, type, config }) => ({
    id: asString(id),
    type: asString(type),
    title:
      typeof config === 'object' && config !== null && 'title' in config
        ? asString(config.title)
        : undefined,
  })),
});

export interface GenerateDashboardToolDeps {
  getDashboardValidator: () => Promise<DashboardValidator>;
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
  /** Whether the Dashboard app takes Lens panels in the Lens API format (Lens as code). */
  isLensApiFormatEnabled: () => Promise<boolean>;
  basePath: Pick<IBasePath, 'publicBaseUrl' | 'serverBasePath'>;
}

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardUpsert} core with a store so the LLM
 * works against a lightweight reference: it reads the prior dashboard from `dashboardId`, writes
 * the result, and returns only the reference and a compact summary. In an Agent Builder
 * conversation the store is a `dashboard` attachment; for every other caller (MCP,
 * `tools/_execute`) it is a dashboard saved object.
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
    description: `Create or update a Kibana dashboard by describing the desired changes, keyed by id. Everything you leave out stays unchanged. Make all changes in one call when possible.

Returns an id for the dashboard plus a compact summary (not the full dashboard). Pass that id as \`dashboardId\` to edit the dashboard later; do not copy the dashboard into follow-up tool calls.

Set \`title\`, \`description\` and \`time_range\`, create or update \`sections\`, \`panels\` and \`controls\`, and list ids to delete in \`remove\`. Each field's description says how to use it well.

Panel positions and sizes are set automatically after the changes are applied, and the summary shows the resulting \`grid\` of every panel. The result lists the ids the call created, updated and removed, so a mistyped id that created a new panel instead of updating one is visible. A panel only moved or resized by the layout step is not listed as updated.`,
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
        const store =
          callContext.callSource === 'agent'
            ? createAttachmentDashboardStore({ attachments, events })
            : await createSavedObjectDashboardStore({
                dashboardClient: await getDashboardClient(),
                savedObjectsClient,
                request,
                spaceId,
                basePath,
                modelProvider,
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
