/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
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
  executeDashboardOperations,
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
  type ValidateDashboard,
} from '@kbn/dashboard-agent-authoring';
import {
  dashboardTools,
  DASHBOARD_UPDATED_UI_EVENT,
  type DashboardUpdatedUiEventData,
} from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { createAttachmentPanelResolver } from './resolvers/attachment_panel_resolver';
import { createControlFieldCapabilitiesResolver } from './resolvers/control_field_capabilities_resolver';
import { createPanelResolver } from './resolvers/panel_resolver';
import { applyDefaultDashboardTimeRange } from './time_range';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const noDashboardCreatedErrorMessage =
  'No dashboard was created because none of the requested panels or controls could be added (see metadata.failures). Fix the failures and call again without dashboardAttachmentId.';

const isEmptyDashboard = ({ panels, pinned_panels: pinnedPanels }: DashboardAttachmentData) =>
  panels.length === 0 && (pinnedPanels ?? []).length === 0;

const generateDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
    ),
  operations: z.array(dashboardOperationSchema).min(1),
});

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
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
        collapsed: widget.collapsed,
        grid: widget.grid,
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
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

export interface GenerateDashboardToolDeps {
  getValidateDashboard: () => Promise<ValidateDashboard>;
}

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardOperations} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, and a compact dashboard summary.
 *
 * This keeps the heavy payload out of the LLM transcript — the model references
 * the attachment id to render it rather than copying it into the next tool call.
 */
export const generateDashboardTool = ({
  getValidateDashboard,
}: GenerateDashboardToolDeps): BuiltinSkillBoundedTool<typeof generateDashboardSchema> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Generate or update a dashboard from ordered operations.

Persists the resulting dashboard as an attachment and returns its id plus a compact summary (not the full payload). Reference the returned attachment id to render the dashboard; do not copy the payload into follow-up tool calls.

Use operations[] to:
1. set metadata
2. add panels generated from a natural-language query (\`source: "request"\`; pick the engine with "renderer": Lens (default), Vega, or custom content for HTML-based layouts that Lens and Vega cannot express), by-value panels (\`source: "config"\`: markdown or ML anomaly panels), or existing visualization attachments by id (\`source: "attachment"\`)
3. edit existing Lens, Vega, custom content, markdown, or ML anomaly panel content
4. update panel layouts without changing content
5. add / remove sections, including inline section panels during add_section
6. remove panels
7. add / remove controls (interactive filters pinned above the dashboard: dropdown, range slider, or time slider)`,
    schema: generateDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, operations },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        if (isNewDashboard && !hasValidCreateMetadataOperations(operations)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();
        const { dashboardData, failures, panelAuthoringNotes } = await executeDashboardOperations({
          dashboardData: latestVersion?.data,
          operations,
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
          finalizeDashboard: (generatedDashboardData) =>
            applyDefaultDashboardTimeRange({
              dashboardData: generatedDashboardData,
              esClient,
              logger,
            }),
          validateDashboard: await getValidateDashboard(),
        });

        const toDashboardResult = (attachmentId: string, version: number) => ({
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
                failures: failures.length > 0 ? failures : undefined,
              },
            },
          ],
        });

        // Nothing survived, so no attachment version is persisted; the failures reach the agent
        // through the tool result.
        if (failures.length > 0 && isNewDashboard && isEmptyDashboard(dashboardData)) {
          logger.info('Dashboard was not created because none of the changes were applied');
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: noDashboardCreatedErrorMessage,
                  metadata: { failures },
                },
              },
            ],
          };
        }
        if (latestVersion && isEqual(dashboardData, latestVersion.data)) {
          logger.info('Dashboard was not updated because it did not change');
          return toDashboardResult(dashboardAttachmentId, latestVersion.version);
        }

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

        return toDashboardResult(attachment.id, attachment.current_version ?? 1);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dashboard: ${errorMessage}`,
                metadata: { dashboardAttachmentId: previousAttachmentId },
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
