/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import parse from 'joi-to-json';
import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { gaugeStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import { tagcloudStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';
import { xyStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/xy';
import { regionMapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/region_map';
import { heatmapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/heatmap';
import {
  createVisualizationGraph,
  guessChartType,
} from '@kbn/agent-builder-platform-plugin/server';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';

const metricSchema = parse(esqlMetricState.getSchema()) as object;
const gaugeSchema = parse(gaugeStateSchemaESQL.getSchema()) as object;
const tagcloudSchema = parse(tagcloudStateSchemaESQL.getSchema()) as object;
const xySchema = parse(xyStateSchema.getSchema()) as object;
const regionMapSchema = parse(regionMapStateSchemaESQL.getSchema()) as object;
const heatmapSchema = parse(heatmapStateSchemaESQL.getSchema()) as object;

const visualizationInputSchema = z.object({
  id: z
    .string()
    .optional()
    .describe(
      '(optional) A unique identifier for this visualization. If not provided, a UUID will be generated.'
    ),
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  chartType: z
    .enum([
      SupportedChartType.Metric,
      SupportedChartType.Gauge,
      SupportedChartType.Tagcloud,
      SupportedChartType.XY,
      SupportedChartType.RegionMap,
      SupportedChartType.Heatmap,
    ])
    .optional()
    .describe(
      '(optional) The type of chart to create. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, tool will automatically generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

const createVisualizationsSchema = z.object({
  visualizations: z
    .array(visualizationInputSchema)
    .min(1)
    .describe('An array of visualization configurations to create.'),
});

function getSchemaForChartType(chartType: SupportedChartType): object {
  switch (chartType) {
    case SupportedChartType.Gauge:
      return gaugeSchema;
    case SupportedChartType.Tagcloud:
      return tagcloudSchema;
    case SupportedChartType.XY:
      return xySchema;
    case SupportedChartType.RegionMap:
      return regionMapSchema;
    case SupportedChartType.Heatmap:
      return heatmapSchema;
    default:
      return metricSchema;
  }
}

export const createVisualizationsTool = (): BuiltinToolDefinition<
  typeof createVisualizationsSchema
> => {
  return {
    id: dashboardTools.createVisualizations,
    type: ToolType.builtin,
    description: `Create multiple visualization configurations in a single batch operation.

This tool will process each visualization sequentially:
1. Determine the best chart type if not specified (from: ${Object.values(SupportedChartType).join(
      ', '
    )})
2. Generate an ES|QL query if not provided
3. Generate valid visualization configurations

Returns an array of visualization results, each with a unique tool_result_id that can be passed to create_dashboard or manage_dashboard.`,
    schema: createVisualizationsSchema,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    tags: [],
    handler: async ({ visualizations }, { esClient, modelProvider, logger, events }) => {
      const results: Array<{
        type: typeof ToolResultType.visualization | typeof ToolResultType.error;
        tool_result_id?: string;
        data: Record<string, unknown>;
      }> = [];

      // Process visualizations sequentially
      for (const vizInput of visualizations) {
        const { query: nlQuery, index, chartType, esql, id: userProvidedId } = vizInput;

        try {
          // Step 1: Determine chart type if not provided
          let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;

          if (!chartType) {
            logger.debug('Chart type not provided, using LLM to suggest one');
            selectedChartType = await guessChartType(modelProvider, '', nlQuery);
          }

          // Step 2: Get schema for chart type
          const schema = getSchemaForChartType(selectedChartType);

          // Step 3: Generate visualization configuration using langgraph with validation retry
          const model = await modelProvider.getDefaultModel();
          const graph = createVisualizationGraph(model, logger, events, esClient);

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

          // Generate unique ID - use user-provided ID or generate one
          const toolResultId = userProvidedId || getToolResultId();

          results.push({
            type: ToolResultType.visualization,
            tool_result_id: toolResultId,
            data: {
              query: nlQuery,
              visualization: validatedConfig,
              chart_type: selectedChartType,
              esql: esqlQuery,
            },
          });

          logger.debug(`Successfully created visualization: ${toolResultId}`);
        } catch (error) {
          logger.error(`Error creating visualization for query "${nlQuery}": ${error.message}`);
          results.push({
            type: ToolResultType.error,
            data: {
              message: `Failed to create visualization: ${error.message}`,
              metadata: { query: nlQuery, index, chartType, esql },
            },
          });
        }
      }

      return { results };
    },
  };
};
