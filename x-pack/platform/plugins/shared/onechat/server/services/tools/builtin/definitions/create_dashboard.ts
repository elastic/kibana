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

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard'),
  description: z.string().optional().describe('Optional description of the dashboard'),
  // Future: panels array
});

export const createDashboardTool = (): BuiltinToolDefinition<typeof createDashboardSchema> => {
  return {
    id: platformCoreTools.createDashboard,
    type: ToolType.builtin,
    description: `Create a new Kibana dashboard with the specified title and description.
  This tool creates a dashboard saved object that can contain visualizations and other panels.`,
    schema: createDashboardSchema,
    handler: async ({ title, description }, { savedObjectsClient, logger, toolProvider }) => {
      try {
        const dashboardAttributes = {
          title,
          description: description || '',
          panelsJSON: JSON.stringify([]),
          optionsJSON: JSON.stringify({}),
          version: 1,
          timeRestore: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: { query: '', language: 'kuery' },
              filter: [],
            }),
          },
        };

        const savedObject = await savedObjectsClient.create(
          DASHBOARD_SAVED_OBJECT_TYPE,
          dashboardAttributes
        );

        logger.info(`Dashboard created with ID: ${savedObject.id}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              tool_result_id: getToolResultId(),
              data: {
                dashboardId: savedObject.id,
                title: savedObject.attributes.title,
                description: savedObject.attributes.description,
                url: `/app/dashboards#/view/${savedObject.id}`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error creating dashboard: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create dashboard: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['dashboard'],
  };
};
