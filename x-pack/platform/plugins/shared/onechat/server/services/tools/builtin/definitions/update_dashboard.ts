/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { getToolResultId } from '@kbn/onechat-server/tools';

const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

const updateDashboardSchema = z.object({
  dashboardId: z.string().describe('The ID of the dashboard to update'),
  title: z.string().optional().describe('New title for the dashboard'),
  description: z.string().optional().describe('New description for the dashboard'),
  // Future: panels updates
});

export const updateDashboardTool = (): BuiltinToolDefinition<typeof updateDashboardSchema> => {
  return {
    id: platformCoreTools.updateDashboard,
    type: ToolType.builtin,
    description: `Update an existing Kibana dashboard's title or description.

Requires a dashboard attachment to be present in the conversation.
This tool modifies the dashboard's metadata.`,
    schema: updateDashboardSchema,
    handler: async ({ dashboardId, title, description }, { savedObjectsClient, logger }) => {
      try {
        // Fetch current dashboard to preserve unchanged fields
        const currentDashboard = await savedObjectsClient.get<{
          title: string;
          description?: string;
        }>(DASHBOARD_SAVED_OBJECT_TYPE, dashboardId);

        const updatedAttributes = {
          ...currentDashboard.attributes,
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        };

        const savedObject = await savedObjectsClient.update<{
          title: string;
          description?: string;
        }>(DASHBOARD_SAVED_OBJECT_TYPE, dashboardId, updatedAttributes);

        logger.info(`Dashboard updated: ${dashboardId}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              tool_result_id: getToolResultId(),
              data: {
                dashboardId: savedObject.id,
                title: savedObject.attributes.title || currentDashboard.attributes.title,
                description: savedObject.attributes.description,
                url: `/app/dashboards#/view/${savedObject.id}`,
                updated: true,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error updating dashboard: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update dashboard: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['dashboard'],
  };
};
