/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type {
  LensMetricConfig,
  LensGaugeConfig,
  LensTagCloudConfig,
  LensPieConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import parse from 'joi-to-json';

import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { getToolResultId } from '@kbn/onechat-server/src/tools';

const createVisualizationSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  existingConfig: z
    .string()
    .optional()
    .describe('An existing visualization configuration to modify.'),
  chartType: z
    .enum(['metric', 'gauge', 'tagcloud', 'pie'])
    .optional()
    .describe(
      '(optional) The type of chart to create. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the generate_esql tool will be used to create the query.'
    ),
});

type SupportedChartType = 'metric' | 'gauge' | 'tagcloud' | 'pie';
type VisualizationConfig = LensMetricConfig | LensGaugeConfig | LensTagCloudConfig | LensPieConfig;

const MAX_RETRY_ATTEMPTS = 5;

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    description: `Create a visualization configuration based on a natural language description.
    
This tool will:
1. Determine the best chart type if not specified (from: metric, gauge, tagcloud, pie)
2. Generate an ES|QL query if not provided
3. Use LLM to create a valid visualization configuration
4. Validate the configuration and retry if needed
5. Return a validated configuration ready to be used`,
    schema: createVisualizationSchema,
    handler: async (
      { query: nlQuery, chartType, esql, existingConfig },
      { runner, modelProvider, logger }
    ) => {
      try {
        // Step 1: Determine chart type if not provided
        let selectedChartType: SupportedChartType = chartType || 'metric';
        const parsedExistingConfig = existingConfig ? JSON.parse(existingConfig) : null;

        if (!chartType) {
          logger.debug('Chart type not provided, using LLM to suggest one');
          const model = await modelProvider.getDefaultModel();
          const chartTypeResponse = await model.chatModel.invoke([
            {
              role: 'system',
              content: `You are a data visualization expert. Based on the user's query, suggest the most appropriate chart type from the following options: metric, gauge, tagcloud, pie.

Respond with ONLY the chart type name, nothing else.

Guidelines:
- metric: For single numeric values, KPIs, or metrics with optional trend lines
- gauge: For progress indicators, goals, or values with min/max ranges
- tagcloud: For displaying word frequencies or categorical data
- pie: For showing proportions or parts of a whole`,
            },
            {
              role: 'user',
              content: existingConfig
                ? `Existing chart type to modify: ${parsedExistingConfig.type}\n\nUser query: ${nlQuery}`
                : nlQuery,
            },
          ]);

          const suggestedType = chartTypeResponse.content
            .toString()
            .trim()
            .toLowerCase() as SupportedChartType;

          if (['metric', 'gauge', 'tagcloud', 'pie'].includes(suggestedType)) {
            selectedChartType = suggestedType;
            logger.debug(`LLM suggested chart type: ${selectedChartType}`);
          } else {
            logger.warn(`LLM suggested invalid chart type: ${suggestedType}, defaulting to metric`);
          }
        }

        // Step 2: Get or generate ES|QL query
        let esqlQuery: string;

        if (!esql) {
          logger.debug('No ES|QL query or index provided, generating one');
          const generateEsqlResult = await runner.runTool({
            toolId: platformCoreTools.generateEsql,
            toolParams: {
              query: existingConfig
                ? `Existing esql query to modify: "${parsedExistingConfig.dataset.query}"\n\nUser query: ${nlQuery}`
                : nlQuery,
            },
          });

          // Extract the ES|QL query from the results
          const queryResult = generateEsqlResult.results.find(
            (result: ToolResult) => result.type === ToolResultType.query
          );

          if (
            !queryResult ||
            !queryResult.data ||
            !('esql' in queryResult.data) ||
            typeof queryResult.data.esql !== 'string'
          ) {
            throw new Error('Failed to generate ES|QL query');
          }

          esqlQuery = queryResult.data.esql;
          logger.debug(`Generated ES|QL query: ${esqlQuery}`);
        } else {
          // Looks like an ES|QL query
          esqlQuery = esql;
          logger.debug('Using provided ES|QL query');
        }

        // Step 3: Generate visualization configuration with validation retry loop
        const model = await modelProvider.getDefaultModel();
        let validatedConfig: any | null = null;

        const schema = parse(esqlMetricState.getSchema());

        const systemPrompt = `You are a Kibana Lens visualization configuration expert. Generate a valid JSON configuration for a ${selectedChartType} visualization based on the provided schema and ES|QL query.


Schema for ${selectedChartType}:
${JSON.stringify(schema, null, 2)}

${existingConfig ? `Existing configuration to modify: ${existingConfig}` : ''}

IMPORTANT RULES:
1. The response must be valid JSON only, no markdown or explanations
2. The 'dataset' field must contain: { type: "esql", query: "<the provided ES|QL query>" }
3. always use { operation: 'value', column: '<esql column name>', ...other options } for operations
4. All field names must match those available in the ES|QL query result
5. Make sure to follow schema definition strictly`;

        // logger.debug(`System prompt: ${systemPrompt}`);

        // Build conversation messages array that will accumulate across retries
        const conversationMessages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `User query: ${nlQuery}
              
ES|QL query: ${esqlQuery}

Generate the ${selectedChartType} visualization configuration in valid JSON format.`,
          },
        ];

        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          logger.debug(
            `Attempting to generate visualization configuration (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`
          );

          const configResponse = await model.chatModel.invoke(conversationMessages);

          // Parse the LLM response
          let configStr = configResponse.content.toString().trim();

          // Remove markdown code blocks if present
          configStr = configStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

          // Add the assistant's response to the conversation
          conversationMessages.push({
            role: 'assistant',
            content: configStr,
          });

          try {
            const config = JSON.parse(configStr) as VisualizationConfig;
            logger.debug(`Configuration: ${configStr}`);
            if (selectedChartType === 'metric') {
              validatedConfig = esqlMetricState.validate(config);
            }
            logger.debug('Configuration validated successfully');
            break;
          } catch (error) {
            const errorMessage = error.message;
            logger.warn(
              `Configuration validation failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${errorMessage}`
            );

            if (attempt === MAX_RETRY_ATTEMPTS) {
              throw new Error(
                `Failed to generate valid configuration after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${errorMessage}`
              );
            }

            // Add validation error feedback to conversation for next attempt
            conversationMessages.push({
              role: 'user',
              content: `The configuration you provided failed JOI schema validation with the following error:

${errorMessage}

Please fix the configuration and provide a corrected version that passes validation. Remember to return valid JSON only, no markdown or explanations.`,
            });
          }
        }

        if (!validatedConfig) {
          throw new Error('Failed to generate validated configuration');
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              tool_result_id: getToolResultId(),
              data: {
                type: 'visualization',
                query: nlQuery,
                visualization: validatedConfig,
                chartType: selectedChartType,
                esqlQuery,
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
              },
            },
          ],
        };
      }
    },
    tags: [],
  };
};
