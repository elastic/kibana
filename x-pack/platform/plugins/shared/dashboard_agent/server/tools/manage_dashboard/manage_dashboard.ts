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
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type AttachmentPanel,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  getPanelDimensions,
  retrieveLatestVersion,
  resolveLensConfigFromAttachment,
} from '../utils';

export { DASHBOARD_PANEL_ADDED_EVENT, DASHBOARD_PANEL_REMOVED_EVENT };

/**
 * Type-safe extraction of error message from unknown error.
 */
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
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
  logger,
}: {
  visualizationIds: string[];
  attachments: Parameters<BuiltinToolDefinition['handler']>[1]['attachments'];
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
const buildVisualizationsFromQueriesWithLLM = async ({
  queries,
  modelProvider,
  esClient,
  events,
  logger,
}: {
  queries: VisualizationQueryInput[];
  modelProvider: Parameters<BuiltinToolDefinition['handler']>[1]['modelProvider'];
  esClient: Parameters<BuiltinToolDefinition['handler']>[1]['esClient'];
  events: Parameters<BuiltinToolDefinition['handler']>[1]['events'];
  logger: Parameters<BuiltinToolDefinition['handler']>[1]['logger'];
}): Promise<{ panels: LensAttachmentPanel[]; failures: VisualizationFailure[] }> => {
  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  const model = await modelProvider.getDefaultModel();
  const graph = createVisualizationGraph(model, logger, events, esClient);

  for (let i = 0; i < queries.length; i++) {
    const { query: nlQuery, index, chartType, esql } = queries[i];

    events.reportProgress?.(`Creating visualization ${i + 1} of ${queries.length}: "${nlQuery}"`);

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
        const latestVersion = retrieveLatestVersion(attachments, dashboardAttachmentId);
        const currentAttachmentId = dashboardAttachmentId ?? uuidv4();


        let panels: AttachmentPanel[] = [...(latestVersion?.data.panels ?? [])];

        // Track failures to report to the user
        const failures: VisualizationFailure[] = [];

        // Remove panels if specified
        if (removePanelIds && removePanelIds.length > 0) {
          const removeSet = new Set(removePanelIds);

          const removedPanels = panels.filter((panel) => removeSet.has(panel.panelId));
          panels = panels.filter((panel) => !removeSet.has(panel.panelId));

          // Emit panel removed events
          for (const removedPanel of removedPanels) {
            events.sendUiEvent(DASHBOARD_PANEL_REMOVED_EVENT, {
              dashboardAttachmentId: currentAttachmentId,
              panelId: removedPanel.panelId,
            });
          }

          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
        }

        if (existingVisualizationIds && existingVisualizationIds.length > 0) {
          const result = await resolveExistingVisualizations({
            visualizationIds: existingVisualizationIds,
            attachments,
            logger,
          });
          panels.push(...result.panels);
          failures.push(...result.failures);

          // todo: come up with a listening mechanism for the dashboard app to update its state in real-time.
          // todo: use the same normalization logic as we use when manipulating attachments.
          for (const panel of result.panels) {
            events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
              dashboardAttachmentId: currentAttachmentId,
              panel: {
                type: 'lens',
                panelId: panel.panelId,
                visualization: panel.visualization,
                title: panel.title,
                dimensions: getPanelDimensions(
                  (panel.visualization as { type?: string }).type ?? 'unknown'
                ),
              },
            });
          }
        }

        // Generate new visualizations from queries (slow - requires LLM)
        if (visualizationQueries && visualizationQueries.length > 0) {
          const result = await buildVisualizationsFromQueriesWithLLM({
            queries: visualizationQueries,
            modelProvider,
            esClient,
            events,
            logger,
          });
          panels.push(...result.panels);
          failures.push(...result.failures);

          // todo: come up with a listening mechanism for the dashboard app to update its state in real-time.
          for (const panel of result.panels) {
            events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
              dashboardAttachmentId: currentAttachmentId,
              panel: {
                type: 'lens',
                panelId: panel.panelId,
                visualization: panel.visualization,
                title: panel.title,
                dimensions: getPanelDimensions(
                  (panel.visualization as { type?: string }).type ?? 'unknown'
                ),
              },
            });
          }
        }

        const input = {
          id: currentAttachmentId,
          type: DASHBOARD_ATTACHMENT_TYPE,
          description: `Dashboard: ${title ?? latestVersion?.data.title}`,
          data: {
            title: title ?? latestVersion?.data.title,
            description: description ?? latestVersion?.data.description,
            markdownContent: markdownContent ?? latestVersion?.data.markdownContent,
            panels, // I think we should normalize the panels here and not have to do it on the client.
          },
        };

        const isNewDashboard = !latestVersion;

        const attachment = isNewDashboard
          ? await attachments.add(input)
          : await attachments.update(currentAttachmentId, input);

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${panels.length} panels`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              failures: failures.length > 0 ? failures : undefined,
              data: {
                version: attachment?.current_version ?? 1,
                dashboardAttachment: {
                  id: attachment?.id,
                  content: {
                    title: input.data.title,
                    description: input.data.description,
                    markdownContent: input.data.markdownContent ?? '',
                    panels: input.data.panels.map(({ type, panelId, title: panelTitle }) => ({
                      type,
                      panelId,
                      title: panelTitle,
                    })),
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
                metadata: { dashboardAttachmentId, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
