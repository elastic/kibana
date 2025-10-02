/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type {
  LensMetricConfig,
  LensGaugeConfig,
  LensTagCloudConfig,
  LensPieConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import parse from 'joi-to-json';
import { StateGraph, Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { getToolResultId } from '@kbn/onechat-server/src/tools';
import { generateEsql } from '@kbn/onechat-genai-utils';

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

// Langgraph state definition
const VisualizationStateAnnotation = Annotation.Root({
  nlQuery: Annotation<string>(),
  esqlQuery: Annotation<string>(),
  chartType: Annotation<SupportedChartType>(),
  schema: Annotation<any>(),
  existingConfig: Annotation<string | undefined>(),

  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  attemptCount: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 0,
  }),

  validatedConfig: Annotation<any | null>(),
  error: Annotation<string | null>(),
});

type VisualizationState = typeof VisualizationStateAnnotation.State;

// Create the langgraph for config generation with validation retry
const createVisualizationGraph = (model: any, logger: any) => {
  // Node: Generate configuration
  const generateConfigNode = async (state: VisualizationState) => {
    const attemptCount = state.attemptCount + 1;
    logger.debug(
      `Attempting to generate visualization configuration (attempt ${attemptCount}/${MAX_RETRY_ATTEMPTS})`
    );

    const systemPrompt = `You are a Kibana Lens visualization configuration expert. Generate a valid JSON configuration for a ${
      state.chartType
    } visualization based on the provided schema and ES|QL query.

Schema for ${state.chartType}:
${JSON.stringify(state.schema, null, 2)}

${state.existingConfig ? `Existing configuration to modify: ${state.existingConfig}` : ''}

IMPORTANT RULES:
1. The response must be valid JSON only, no markdown or explanations
2. The 'dataset' field must contain: { type: "esql", query: "<the provided ES|QL query>" }
3. always use { operation: 'value', column: '<esql column name>', ...other options } for operations
4. All field names must match those available in the ES|QL query result
5. Make sure to follow schema definition strictly`;

    const messages: BaseMessage[] = [
      new HumanMessage(systemPrompt),
      new HumanMessage(`User query: ${state.nlQuery}

ES|QL query: ${state.esqlQuery}

Generate the ${state.chartType} visualization configuration in valid JSON format.`),
      ...state.messages,
    ];

    const configResponse = await model.chatModel.invoke(messages);

    return {
      messages: [new AIMessage(configResponse.content)],
      attemptCount,
    };
  };

  const validateConfigNode = async (state: VisualizationState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    let configStr = lastMessage.content.toString().trim();

    // Remove markdown code blocks if present
    configStr = configStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    try {
      const config = JSON.parse(configStr) as VisualizationConfig;
      logger.debug(`Configuration: ${configStr}`);

      let validatedConfig: any | null = null;
      if (state.chartType === 'metric') {
        validatedConfig = esqlMetricState.validate(config);
      }
      // TODO: Add validation for other chart types (gauge, tagcloud, pie)

      logger.debug('Configuration validated successfully');
      return {
        validatedConfig,
        error: null,
      };
    } catch (error) {
      const errorMessage = error.message;
      logger.warn(
        `Configuration validation failed (attempt ${state.attemptCount}/${MAX_RETRY_ATTEMPTS}): ${errorMessage}`
      );

      return {
        validatedConfig: null,
        error: errorMessage,
      };
    }
  };

  const addValidationFeedbackNode = async (state: VisualizationState) => {
    const feedbackMessage = new HumanMessage(
      `The configuration you provided failed JOI schema validation with the following error:

${state.error}

Please fix the configuration and provide a corrected version that passes validation. Remember to return valid JSON only, no markdown or explanations.`
    );

    return {
      messages: [feedbackMessage],
      error: null,
    };
  };

  const shouldRetryRouter = (state: VisualizationState) => {
    if (state.validatedConfig) {
      return '__end__';
    }

    if (state.attemptCount >= MAX_RETRY_ATTEMPTS) {
      return '__end__';
    }

    return 'add_feedback';
  };

  const graph = new StateGraph(VisualizationStateAnnotation)
    .addNode('generate_config', generateConfigNode)
    .addNode('validate_config', validateConfigNode)
    .addNode('add_feedback', addValidationFeedbackNode)
    .addEdge('__start__', 'generate_config')
    .addEdge('generate_config', 'validate_config')
    .addConditionalEdges('validate_config', shouldRetryRouter, {
      add_feedback: 'add_feedback',
      __end__: '__end__',
    })
    .addEdge('add_feedback', 'generate_config')
    .compile();

  return graph;
};

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    description: `Create a visualization configuration based on a natural language description.

This tool will:
1. Determine the best chart type if not specified (from: metric, gauge, tagcloud, pie)
2. Generate an ES|QL query if not provided
3. Generate a valid visualization configuration`,
    schema: createVisualizationSchema,
    handler: async (
      { query: nlQuery, chartType, esql, existingConfig },
      { esClient, modelProvider, logger }
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
          const model = await modelProvider.getDefaultModel();
          const generateEsqlResponse = await generateEsql({
            nlQuery: existingConfig
              ? `Existing esql query to modify: "${parsedExistingConfig.dataset.query}"\n\nUser query: ${nlQuery}`
              : nlQuery,
            model,
            esClient: esClient.asCurrentUser,
          });

          if (!generateEsqlResponse.queries || generateEsqlResponse.queries.length === 0) {
            throw new Error('Failed to generate ES|QL query');
          }

          esqlQuery = generateEsqlResponse.queries[0];
          logger.debug(`Generated ES|QL query: ${esqlQuery}`);
        } else {
          // Looks like an ES|QL query
          esqlQuery = esql;
          logger.debug('Using provided ES|QL query');
        }

        // Step 3: Generate visualization configuration using langgraph with validation retry
        const model = await modelProvider.getDefaultModel();
        const schema = parse(esqlMetricState.getSchema());

        // Create and invoke the validation retry graph
        const graph = createVisualizationGraph(model, logger);

        const finalState = await graph.invoke({
          nlQuery,
          esqlQuery,
          chartType: selectedChartType,
          schema,
          existingConfig,
          messages: [],
          attemptCount: 0,
          validatedConfig: null,
          error: null,
        });

        const { validatedConfig, error, attemptCount } = finalState;

        if (!validatedConfig) {
          throw new Error(
            `Failed to generate valid configuration after ${attemptCount} attempts. Last error: ${
              error || 'Unknown error'
            }`
          );
        }

        return {
          results: [
            {
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: {
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
