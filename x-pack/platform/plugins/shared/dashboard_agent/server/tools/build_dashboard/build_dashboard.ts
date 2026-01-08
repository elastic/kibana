/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';
import { createBuildDashboardGraph } from './graph';

const buildDashboardSchema = z.object({
  query: z
    .string()
    .describe(
      "The user's high-level intent for the dashboard (e.g., 'server metrics', 'user activity'). Do not specify individual visualizations - the tool will plan those automatically based on the available data."
    ),
  title: z
    .string()
    .optional()
    .describe('Dashboard title. If not provided, one will be generated based on the query.'),
  description: z
    .string()
    .optional()
    .describe('Dashboard description. If not provided, one will be generated based on the query.'),
  index: z
    .string()
    .optional()
    .describe(
      'Optional index pattern to target. If not provided, the tool will discover relevant indices.'
    ),
});

export interface BuildDashboardToolDependencies {
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
}

export const buildDashboardTool = ({
  dashboardLocator,
  spaces,
}: BuildDashboardToolDependencies): BuiltinToolDefinition<typeof buildDashboardSchema> => {
  return {
    id: dashboardTools.buildDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Build a complete dashboard from a high-level user intent.

This tool handles everything automatically:
1. Discovers the relevant index and available fields
2. Plans appropriate visualizations based on the data
3. Creates each panel and streams it to a live preview
4. Generates a link to the unsaved dashboard

Just pass the user's intent (e.g., "server metrics", "log analysis") - do NOT pre-plan specific visualizations.
The tool will determine the best visualizations based on the actual fields available in the data.`,
    schema: buildDashboardSchema,
    tags: [],
    handler: async (
      { query, title, description, index },
      { logger, request, esClient, modelProvider, events }
    ) => {
      try {
        logger.debug(`Building dashboard from query: ${query}`);

        // Generate title and description if not provided
        const dashboardTitle = title || generateTitle(query);
        const dashboardDescription = description || generateDescription(query);

        // Get the default model for LLM operations
        const model = await modelProvider.getDefaultModel();

        // Create and invoke the build dashboard graph
        const graph = createBuildDashboardGraph({
          model,
          modelProvider,
          logger,
          events,
          esClient,
          dashboardLocator,
          spaces,
          request,
        });

        const finalState = await graph.invoke({
          query,
          title: dashboardTitle,
          description: dashboardDescription,
          index,
          plannedPanels: [],
          markdownContent: '',
          currentPanelIndex: 0,
          createdPanels: [],
          currentAttempt: 0,
          actions: [],
          dashboardUrl: null,
          error: null,
        });

        const { dashboardUrl, error, createdPanels } = finalState;

        if (error && createdPanels.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to build dashboard: ${error}`,
                  metadata: { query, title: dashboardTitle },
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                id: 'unsaved',
                title: dashboardTitle,
                content: {
                  url: dashboardUrl,
                  description: dashboardDescription,
                  panelCount: createdPanels.length,
                  note: 'This is an unsaved dashboard. Click the link to view and save it.',
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in build_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to build dashboard: ${error.message}`,
                metadata: { query, title },
              },
            },
          ],
        };
      }
    },
  };
};

/**
 * Generate a title from the query if not provided
 */
function generateTitle(query: string): string {
  // Extract key terms and create a title
  const words = query.split(/\s+/).slice(0, 5);
  const titleWords = words
    .filter((w) => w.length > 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .slice(0, 4);

  return titleWords.length > 0 ? `${titleWords.join(' ')} Dashboard` : 'Generated Dashboard';
}

/**
 * Generate a description from the query if not provided
 */
function generateDescription(query: string): string {
  return `Dashboard created from: ${query.slice(0, 200)}${query.length > 200 ? '...' : ''}`;
}
