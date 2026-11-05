/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isSection,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

import {
  arrangeDashboardLayout,
  executeDashboardUpsert,
  getErrorMessage,
  hasValidNewDashboardMetadata,
  upsertDashboardSchema,
  type DashboardValidator,
} from '@kbn/dashboard-agent-authoring';
import {
  dashboardTools,
  DASHBOARD_UPDATED_UI_EVENT,
  type DashboardUpdatedUiEventData,
} from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { createAttachmentPanelResolver } from './resolvers/attachment_panel_resolver';
import { createControlFieldCapabilitiesResolver } from './resolvers/control_field_capabilities_resolver';
import { createEsqlControlColumnTypeResolver } from './resolvers/esql_control_column_type_resolver';
import { createLayoutArranger } from './layout_arranger';
import { createPanelResolver } from './resolvers/panel_resolver';
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
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call. Panel titles let it tell panels apart when their ids
 * do not describe them, and grids let it report where the layout step put panels.
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
}

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardUpsert} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardId`, the attachment id,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, and a compact dashboard summary.
 *
 * This keeps the heavy payload out of the LLM transcript — the model references
 * the attachment id to render it rather than copying it into the next tool call.
 */
export const generateDashboardTool = ({
  getDashboardValidator,
}: GenerateDashboardToolDeps): BuiltinSkillBoundedTool<typeof generateDashboardSchema> => {
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
    handler: async (
      { dashboardId: previousAttachmentId, layout, ...upsert },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        if (isNewDashboard && !hasValidNewDashboardMetadata(upsert)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();
        const {
          dashboardData: validatedDashboardData,
          created,
          updated,
          removed,
          failures,
          panelAuthoringNotes,
        } = await executeDashboardUpsert({
          dashboardData: latestVersion?.data,
          upsert,
          logger,
          resolvePanelContent: createPanelResolver({
            logger,
            modelProvider,
            events,
            esClient,
          }),
          resolveAttachmentPanel: createAttachmentPanelResolver({ attachments }),
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
            originalPanels: latestVersion?.data.panels ?? [],
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
          attachmentId: string,
          version: number
        ) => ({
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                attachment_id: attachmentId,
                version,
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

        // None of the requested panels and controls were added, so no attachment version is
        // persisted; the failures reach the agent through the tool result. Controls the agent
        // added on its own are left out without a failure, so the failures can be empty.
        const requestedContent = (upsert.panels?.length ?? 0) + (upsert.controls?.length ?? 0) > 0;
        if (isNewDashboard && requestedContent && isEmptyDashboard(generatedDashboardData)) {
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
        if (latestVersion && isEqual(generatedDashboardData, latestVersion.data)) {
          logger.info('Dashboard was not updated because it did not change');
          return toDashboardResult(
            generatedDashboardData,
            dashboardAttachmentId,
            latestVersion.version
          );
        }

        // Data-aware default time range computation
        const dashboardData = await applyDefaultDashboardTimeRange({
          dashboardData: generatedDashboardData,
          esClient,
          logger,
        });

        const description = `Dashboard: ${dashboardData.title}`;
        const attachment = isNewDashboard
          ? await attachments.add({
              id: dashboardAttachmentId,
              type: DASHBOARD_ATTACHMENT_TYPE,
              description,
              data: dashboardData,
            })
          : await attachments.update(dashboardAttachmentId, {
              data: dashboardData,
              description,
            });

        if (!attachment) {
          throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
        }

        logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

        events.sendUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData>(
          DASHBOARD_UPDATED_UI_EVENT,
          {
            attachment: {
              id: attachment.id,
              type: DASHBOARD_ATTACHMENT_TYPE,
              data: dashboardData,
              origin: attachment.origin,
            },
          }
        );

        return toDashboardResult(dashboardData, attachment.id, attachment.current_version ?? 1);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dashboard: ${errorMessage}`,
                metadata: { dashboardId: previousAttachmentId },
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
