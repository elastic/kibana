/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { DASHBOARD_ATTACHMENT_TYPE, isSection } from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import {
  retrieveLatestVersion,
  getErrorMessage,
  resolvePanelsFromAttachments,
  hasValidCreateMetadataOperations,
  type VisualizationFailure,
} from './utils';
import { createVisualizationResolver } from './inline_visualization';
import { dashboardOperationSchema, executeDashboardOperations } from './operations';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const manageDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The dashboard attachment ID to modify. If not provided, a new dashboard is created.'
    ),
  operations: z.array(dashboardOperationSchema).min(1),
});

export const manageDashboardTool = (): BuiltinSkillBoundedTool<typeof manageDashboardSchema> => {
  return {
    id: dashboardTools.manageDashboard,
    type: ToolType.builtin,
    description: `Create or update an dashboard with visualizations.

This tool executes ordered dashboard operations against a dashboard attachment in conversation context.

Use operations[] to:
1. set metadata
2. add markdown
3. add panels from attachments
4. create Lens visualization panels inline from natural language
5. edit existing Lens visualization panels
6. update panel layouts without changing content
7. add / remove sections, including inline section panels during add_section
8. remove panels`,
    schema: manageDashboardSchema,
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
        const resolveVisualizationConfig = createVisualizationResolver({
          logger,
          modelProvider,
          events,
          esClient,
        });

        const operationResult = await executeDashboardOperations({
          dashboardData: latestVersion?.data,
          operations,
          logger,
          resolvePanelsFromAttachments: (attachmentInputs) =>
            resolvePanelsFromAttachments({
              attachmentInputs,
              attachments,
              logger,
            }),
          resolveVisualizationConfig,
        });

        const failures: VisualizationFailure[] = operationResult.failures;
        const updatedDashboardData = operationResult.dashboardData;

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

        const panelCount = updatedDashboardData.panels.reduce((count, widget) => {
          if (isSection(widget)) {
            return count + widget.panels.length;
          }
          return count + 1;
        }, 0);

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${panelCount} panels`
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
                    title: updatedDashboardData.title,
                    description: updatedDashboardData.description,
                    panels: updatedDashboardData.panels.map((widget) => {
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
                          })),
                        };
                      }
                      return {
                        type: widget.type,
                        id: widget.id,
                        grid: widget.grid,
                      };
                    }),
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
