/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType, SupportedChartType } from '@kbn/onechat-common/tools/tool_result';
import parse from 'joi-to-json';

import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { getToolResultId } from '@kbn/onechat-server';
import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import { guessChartType } from './guess_chart_type';
import { createVisualizationGraph } from './graph_lens';

const metricSchema = parse(esqlMetricState.getSchema()) as object;

const createVisualizationSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  existingConfig: z
    .string()
    .optional()
    .describe('An existing visualization configuration to modify.'),
  chartType: z
    .enum([SupportedChartType.Metric, SupportedChartType.Map])
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, tool with automatically generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    type: ToolType.builtin,
    description: `Create a visualization configuration based on a natural language description.

This tool will:
1. Determine the best chart type if not specified (from: ${Object.values(SupportedChartType).join(
      ', '
    )})
2. Generate an ES|QL query if not provided
3. Generate a valid visualization configuration`,
    schema: createVisualizationSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ uiSettings }) => {
        const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
        return { status: enabled ? 'available' : 'unavailable' };
      },
    },
    tags: [],
    handler: async (
      { query: nlQuery, chartType, esql, existingConfig },
      { esClient, modelProvider, logger, events }
    ) => {
      try {
        // @TODO: remove
        console.log(`--@@query`, query);
        // Step 1: Determine chart type if not provided
        let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;
        const parsedExistingConfig = existingConfig ? JSON.parse(existingConfig) : null;

        if (!chartType) {
          logger.debug('Chart type not provided, using LLM to suggest one');
          selectedChartType = await guessChartType(
            modelProvider,
            parsedExistingConfig?.type,
            nlQuery
          );
        }

        // Step 2: Generate visualization configuration using langgraph with validation retry
        const model = await modelProvider.getDefaultModel();
        const schema = metricSchema;

        // Create and invoke the validation retry graph
        const graph = createVisualizationGraph(model, logger, events, esClient);

        const finalState = await graph.invoke({
          nlQuery,
          chartType: selectedChartType,
          schema,
          existingConfig,
          parsedExistingConfig,
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

        // @TODO: remove
        console.log(
          `--@@{
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: {
                query: nlQuery,
                visualization: validatedConfig,
                chart_type: selectedChartType,
                esql: esqlQuery,
              },
            }`,
          {
            type: ToolResultType.visualization,
            tool_result_id: getToolResultId(),
            data: {
              query: nlQuery,
              visualization: validatedConfig,
              chart_type: selectedChartType,
              esql: esqlQuery,
            },
          }
        );
        // @TODO: remove
        console.log(`--@@`, {
          type: ToolResultType.visualization,
          tool_result_id: getToolResultId(),
          data: {
            query: nlQuery,
            visualization: validatedConfig,
            chart_type: selectedChartType,
            esql: esqlQuery,
          },
        });
        return {
          results: [
            {
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: {
                query: nlQuery,
                visualization: validatedConfig,
                chart_type: selectedChartType,
                esql: esqlQuery,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in create_visualization tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create visualization: ${error.message}`,
                metadata: { nlQuery, esql, chartType },
              },
            },
          ],
        };
      }
    },
  };
};
