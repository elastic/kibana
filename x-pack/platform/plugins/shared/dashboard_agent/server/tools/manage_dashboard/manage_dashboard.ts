/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  createVisualizationGraph,
  guessChartType,
  getSchemaForChartType,
} from '@kbn/agent-builder-platform-plugin/server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type DashboardAttachmentData,
  type AttachmentPanel,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability, resolveLensConfigFromAttachment } from '../utils';

export { DASHBOARD_PANEL_ADDED_EVENT, DASHBOARD_PANEL_REMOVED_EVENT };

/**
 * Type-safe extraction of error message from unknown error.
 */
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * Helper to extract panel ID from any panel entry type.
 */
const getPanelId = (panel: AttachmentPanel): string => {
  return panel.panelId;
};

/**
 * Failure record for tracking visualization errors.
 */
interface VisualizationFailure {
  type: string;
  identifier: string;
  error: string;
}

/**
 * Panel dimension constants matching panel_utils.ts normalization logic.
 */
const DEFAULT_PANEL_HEIGHT = 12;
const SMALL_PANEL_WIDTH = 12;
const LARGE_PANEL_WIDTH = 24;
const SMALL_CHART_TYPES = new Set(['metric', 'gauge']);

/**
 * Calculates panel dimensions based on chart type.
 * Matches the logic in panel_utils.ts normalizePanels function.
 */
const getPanelDimensions = (chartType: string): { width: number; height: number } => {
  return {
    width: SMALL_CHART_TYPES.has(chartType) ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
  };
};

/**
 * Input for generating a visualization from natural language.
 */
interface VisualizationQueryInput {
  query: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
}

/**
 * Resolves existing visualization attachments and adds them as dashboard panels.
 * - simply looks up pre-built configurations.
 */
const resolveExistingVisualizations = async ({
  visualizationIds,
  attachments,
  dashboardAttachmentId,
  events,
  logger,
}: {
  visualizationIds: string[];
  attachments: Parameters<BuiltinToolDefinition['handler']>[1]['attachments'];
  dashboardAttachmentId: string;
  events: Parameters<BuiltinToolDefinition['handler']>[1]['events'];
  logger: Parameters<BuiltinToolDefinition['handler']>[1]['logger'];
}): Promise<{ panels: LensAttachmentPanel[]; failures: VisualizationFailure[] }> => {
  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  for (const attachmentId of visualizationIds) {
    try {
      const vizConfig = resolveLensConfigFromAttachment(attachmentId, attachments);

      const panelEntry: LensAttachmentPanel = {
        type: 'lens',
        panelId: uuidv4(),
        visualization: vizConfig,
        title: vizConfig.title,
      };
      panels.push(panelEntry);

      events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
        dashboardAttachmentId,
        panel: {
          type: 'lens',
          panelId: panelEntry.panelId,
          visualization: vizConfig,
          title: vizConfig.title,
          dimensions: getPanelDimensions(vizConfig.type),
        },
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error resolving visualization attachment "${attachmentId}": ${errorMessage}`);
      failures.push({
        type: 'existing_visualization',
        identifier: attachmentId,
        error: errorMessage,
      });
    }
  }

  logger.debug(
    `Successfully resolved ${panels.length}/${visualizationIds.length} existing visualizations`
  );

  return { panels, failures };
};

/**
 * Generates new visualizations from natural language queries using LLM - requires AI inference.
 */
const generateVisualizationsFromQueries = async ({
  queries,
  modelProvider,
  esClient,
  dashboardAttachmentId,
  events,
  logger,
}: {
  queries: VisualizationQueryInput[];
  modelProvider: Parameters<BuiltinToolDefinition['handler']>[1]['modelProvider'];
  esClient: Parameters<BuiltinToolDefinition['handler']>[1]['esClient'];
  dashboardAttachmentId: string;
  events: Parameters<BuiltinToolDefinition['handler']>[1]['events'];
  logger: Parameters<BuiltinToolDefinition['handler']>[1]['logger'];
}): Promise<{ panels: LensAttachmentPanel[]; failures: VisualizationFailure[] }> => {
  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  const model = await modelProvider.getDefaultModel();
  const graph = createVisualizationGraph(model, logger, events, esClient);

  for (let i = 0; i < queries.length; i++) {
    const { query: nlQuery, index, chartType, esql } = queries[i];

    events.reportProgress(`Creating visualization ${i + 1} of ${queries.length}: "${nlQuery}"`);

    try {
      let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;
      if (!chartType) {
        logger.debug('Chart type not provided, using LLM to suggest one');
        selectedChartType = await guessChartType(modelProvider, '', nlQuery);
      }

      const schema = getSchemaForChartType(selectedChartType);

      const finalState = await graph.invoke({
        nlQuery,
        index,
        chartType: selectedChartType,
        schema,
        existingConfig: undefined,
        parsedExistingConfig: null,
        esqlQuery: esql || '',
        currentAttempt: 0,
        actions: [],
        validatedConfig: null,
        error: null,
      });

      const { validatedConfig, error, currentAttempt, esqlQuery } = finalState;

      if (!validatedConfig) {
        throw new Error(
          `Failed to generate valid configuration after ${currentAttempt} attempts. Last error: ${
            error || 'Unknown error'
          }`
        );
      }

      const panelEntry: LensAttachmentPanel = {
        type: 'lens',
        panelId: uuidv4(),
        visualization: validatedConfig,
        title: validatedConfig.title ?? nlQuery.slice(0, 50),
        query: nlQuery,
        esql: esqlQuery,
      };

      panels.push(panelEntry);

      events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
        dashboardAttachmentId,
        panel: {
          type: 'lens',
          panelId: panelEntry.panelId,
          visualization: validatedConfig,
          title: panelEntry.title,
          dimensions: getPanelDimensions(validatedConfig.type),
        },
      });

      logger.debug(`Created lens visualization: ${panelEntry.panelId}`);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error creating visualization for query "${nlQuery}": ${errorMessage}`);
      failures.push({
        type: 'generated_visualization',
        identifier: nlQuery,
        error: errorMessage,
      });
    }
  }

  return { panels, failures };
};

/**
 * Input schema for generating a visualization from natural language.
 */
const visualizationQuerySchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z.string().optional().describe('(optional) Index, alias, or datastream to target.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('(optional) The type of chart to create.'),
  esql: z.string().optional().describe('(optional) An ES|QL query to use for the visualization.'),
}) satisfies z.ZodType<VisualizationQueryInput>;

const manageDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The dashboard attachment ID to modify. If not provided, a new dashboard is created.'
    ),
  title: z
    .string()
    .optional()
    .describe('The title for the dashboard. Required when creating a new dashboard.'),
  description: z
    .string()
    .optional()
    .describe('The description for the dashboard. Required when creating a new dashboard.'),
  markdownContent: z
    .string()
    .optional()
    .describe('(optional) Markdown content for a summary panel at the top of the dashboard.'),
  visualizationQueries: z
    .array(visualizationQuerySchema)
    .optional()
    .describe(
      '(optional) Array of natural language queries to generate new visualizations using LLM.'
    ),
  existingVisualizationIds: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of existing visualization attachment IDs to add to the dashboard.'),
  removePanelIds: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of panel IDs to remove from the dashboard.'),
});

export const manageDashboardTool = ({}: {}): BuiltinToolDefinition<
  typeof manageDashboardSchema
> => {
  return {
    id: dashboardTools.manageDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Create or update an in-memory dashboard with visualizations.

This tool can:
1. Create a new dashboard (when dashboardAttachmentId is not provided)
2. Update an existing dashboard (when dashboardAttachmentId is provided)
3. Add inline visualizations by describing them in natural language
4. Add existing visualization attachments by ID
5. Remove panels by their panel ID

When creating a new dashboard, title and description are required.
When updating, all fields are optional and only the provided ones are updated.

The tool emits UI events (dashboard:panel_added, dashboard:panel_removed) that can be used by the dashboard app to update its state in real-time.`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      {
        dashboardAttachmentId,
        title,
        description,
        markdownContent,
        visualizationQueries,
        existingVisualizationIds,
        removePanelIds,
      },
      { logger, attachments, esClient, modelProvider, events }
    ) => {
      try {
        let currentAttachmentId: string;
        let previousData: DashboardAttachmentData;
        let isNewDashboard = false;

        if (dashboardAttachmentId) {
          // Updating existing dashboard
          currentAttachmentId = dashboardAttachmentId;

          const dashboardAttachment = attachments.getAttachmentRecord(currentAttachmentId);
          if (!dashboardAttachment) {
            throw new Error(`Dashboard attachment "${currentAttachmentId}" not found.`);
          }

          if (dashboardAttachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
            throw new Error(`Attachment "${currentAttachmentId}" is not a dashboard attachment.`);
          }

          const latestVersion = getLatestVersion(dashboardAttachment);
          if (!latestVersion) {
            throw new Error(
              `Could not retrieve latest version of dashboard attachment "${currentAttachmentId}".`
            );
          }

          previousData = latestVersion.data as DashboardAttachmentData;
        } else {
          // Creating new dashboard
          isNewDashboard = true;

          if (!title) {
            throw new Error('Title is required when creating a new dashboard.');
          }
          if (!description) {
            throw new Error('Description is required when creating a new dashboard.');
          }

          const initialData: DashboardAttachmentData = {
            title,
            description,
            markdownContent,
            panels: [],
          };

          const newAttachment = await attachments.add({
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: initialData,
            description: `Dashboard: ${title}`,
          });

          currentAttachmentId = newAttachment.id;
          previousData = initialData;
          logger.debug(`Created new dashboard attachment: ${currentAttachmentId}`);
        }

        // Start with existing panels
        let panels: AttachmentPanel[] = [...previousData.panels];

        // Track failures to report to the user
        const failures: VisualizationFailure[] = [];

        // Remove panels if specified
        if (removePanelIds && removePanelIds.length > 0) {
          const removeSet = new Set(removePanelIds);
          const removedPanels = panels.filter((panel) => removeSet.has(getPanelId(panel)));

          panels = panels.filter((panel) => !removeSet.has(getPanelId(panel)));

          // Emit panel removed events
          for (const removedPanel of removedPanels) {
            events.sendUiEvent(DASHBOARD_PANEL_REMOVED_EVENT, {
              dashboardAttachmentId: currentAttachmentId,
              panelId: getPanelId(removedPanel),
            });
          }

          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
        }

        if (existingVisualizationIds && existingVisualizationIds.length > 0) {
          const result = await resolveExistingVisualizations({
            visualizationIds: existingVisualizationIds,
            attachments,
            dashboardAttachmentId: currentAttachmentId,
            events,
            logger,
          });
          panels.push(...result.panels);
          failures.push(...result.failures);
        }

        // Generate new visualizations from queries (slow - requires LLM)
        if (visualizationQueries && visualizationQueries.length > 0) {
          const result = await generateVisualizationsFromQueries({
            queries: visualizationQueries,
            modelProvider,
            esClient,
            dashboardAttachmentId: currentAttachmentId,
            events,
            logger,
          });
          panels.push(...result.panels);
          failures.push(...result.failures);
        }

        // Build updated metadata
        const updatedTitle = title ?? previousData.title;
        const updatedDescription = description ?? previousData.description;
        const updatedMarkdownContent = markdownContent ?? previousData.markdownContent;

        // add a wait here for 1 minut
        await new Promise((resolve) => setTimeout(resolve, 60000));
        const updatedAttachment = await attachments.update(currentAttachmentId, {
          data: {
            title: updatedTitle,
            description: updatedDescription,
            markdownContent: updatedMarkdownContent,
            panels,
          },
          description: `Dashboard: ${updatedTitle}`,
        });

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${panels.length} panels`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                dashboardAttachmentId: currentAttachmentId,
                version: updatedAttachment?.current_version ?? 1,
                title: updatedTitle,
                description: updatedDescription,
                markdownContent: updatedMarkdownContent,
                panelCount: panels.length + (updatedMarkdownContent ? 1 : 0),
                panels: panels.map((panel) => ({
                  type: panel.type,
                  panelId: getPanelId(panel),
                  title: panel.title,
                })),
                failures: failures.length > 0 ? failures : undefined,
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
                metadata: { dashboardAttachmentId, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
