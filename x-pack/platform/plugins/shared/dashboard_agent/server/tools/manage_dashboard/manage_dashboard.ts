/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type PanelAddedEventData,
  type PanelsRemovedEventData,
} from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import {
  retrieveLatestVersion,
  getErrorMessage,
  resolvePanelsFromAttachments,
  type VisualizationFailure,
} from './utils';
import { buildVisualizationsFromQueriesWithLLM } from './visualization_generation';
import { dashboardOperationSchema, executeDashboardOperations } from './operations';

const manageDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The dashboard attachment ID to modify. If not provided, a new dashboard is created.'
    ),
  operations: z.array(dashboardOperationSchema).min(1),
});

const createEmptyDashboardData = (): DashboardAttachmentData => ({
  title: '',
  description: '',
  panels: [],
});

export const manageDashboardTool = (): BuiltinSkillBoundedTool => {
  return {
    id: dashboardTools.manageDashboard,
    type: ToolType.builtin,
    description: `Create or update an in-memory dashboard with visualizations.

This tool executes ordered dashboard operations against a dashboard attachment in conversation context.

Use operations[] to:
1. set metadata
2. upsert markdown
3. add generated panels in bulk
4. add panels from attachments
5. remove panels

The tool emits UI events (dashboard:panel_added, dashboard:panels_removed) while operations run, and always returns the latest dashboard attachment state.`,
    schema: manageDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, operations },
      { logger, attachments, esClient, modelProvider, events }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();
        const sendAddedEvents = (panels: AttachmentPanel[]) => {
          for (const panel of panels) {
            const addedPayload: PanelAddedEventData = {
              dashboardAttachmentId,
              panel,
            };
            events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, addedPayload);
          }
        };

        const sendRemovedEvents = (panels: AttachmentPanel[]) => {
          if (panels.length === 0) {
            return;
          }

          const removedPayload: PanelsRemovedEventData = {
            dashboardAttachmentId,
            panelIds: panels.map(({ panelId }) => panelId),
          };
          events.sendUiEvent(DASHBOARD_PANELS_REMOVED_EVENT, removedPayload);
        };

        const operationResult = await executeDashboardOperations({
          dashboardData: latestVersion?.data ?? createEmptyDashboardData(),
          operations,
          logger,
          generatePanels: (items, onPanelCreated) =>
            buildVisualizationsFromQueriesWithLLM({
              queries: items,
              modelProvider,
              esClient,
              events,
              onPanelCreated,
              logger,
            }),
          resolvePanelsFromAttachments: (attachmentIds) =>
            resolvePanelsFromAttachments({
              attachmentIds,
              attachments,
              logger,
            }),
          onPanelsAdded: sendAddedEvents,
          onPanelsRemoved: sendRemovedEvents,
        });

        const failures: VisualizationFailure[] = operationResult.failures;
        const updatedDashboardData = operationResult.dashboardData;

        if (isNewDashboard && (!updatedDashboardData.title || !updatedDashboardData.description)) {
          logger.error('Title and description are required when creating a new dashboard.');
          return noTitleOrDescriptionErrorResult;
        }

        const attachmentInput = {
          id: dashboardAttachmentId,
          type: DASHBOARD_ATTACHMENT_TYPE,
          description: `Dashboard: ${updatedDashboardData.title}`,
          data: updatedDashboardData,
        };

        const attachment = isNewDashboard
          ? await attachments.add(attachmentInput)
          : await attachments.update(dashboardAttachmentId, {
              data: updatedDashboardData,
              description: attachmentInput.description,
            });

        if (!attachment) {
          throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
        }

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${
            updatedDashboardData.panels.length
          } panels`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                version: attachment.current_version ?? 1,
                failures: failures.length > 0 ? failures : undefined,
                dashboardAttachment: {
                  id: attachment.id,
                  content: {
                    ...updatedDashboardData,
                    panels: updatedDashboardData.panels.map(
                      ({ type, panelId, title: panelTitle }) => ({
                        type,
                        panelId,
                        title: panelTitle ?? '',
                      })
                    ),
                  },
                },
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in manage_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to manage dashboard: ${errorMessage}`,
                metadata: {
                  dashboardAttachmentId: previousAttachmentId,
                  operations,
                },
              },
            },
          ],
        };
      }
    },
  };
};

const noTitleOrDescriptionErrorResult = {
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: 'Title and description are required when creating a new dashboard.',
      },
    },
  ],
};
