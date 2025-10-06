/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
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

const metricSchema = parse(esqlMetricState.getSchema());

// Helper function to fix array schemas by adding missing items
const fixArraySchemas = (schema: any): any => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // If type is an array of schemas (not a type array like ["string", "null"]),
  // this is non-standard and we should handle it specially
  if (Array.isArray(schema.type) && typeof schema.type[0] === 'object') {
    return {
      ...schema,
      type: schema.type.map(fixArraySchemas),
    };
  }

  // Handle arrays - ensure they have items property
  if (schema.type === 'array' && !schema.items) {
    return {
      ...schema,
      items: {},
    };
  }

  // Handle arrays defined as ["array", ...] union types
  if (Array.isArray(schema.type) && schema.type.includes('array') && !schema.items) {
    // Remove 'array' from the type union since we can't properly define it without items
    const filteredTypes = schema.type.filter((t: string) => t !== 'array');
    return {
      ...schema,
      type: filteredTypes.length === 1 ? filteredTypes[0] : filteredTypes,
    };
  }

  // Recursively fix properties
  if (schema.properties) {
    const fixedProperties: any = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      fixedProperties[key] = fixArraySchemas(value);
    }
    schema = { ...schema, properties: fixedProperties };
  }

  // Recursively fix anyOf/oneOf/allOf
  if (schema.anyOf) {
    schema = { ...schema, anyOf: schema.anyOf.map(fixArraySchemas) };
  }
  if (schema.oneOf) {
    schema = { ...schema, oneOf: schema.oneOf.map(fixArraySchemas) };
  }
  if (schema.allOf) {
    schema = { ...schema, allOf: schema.allOf.map(fixArraySchemas) };
  }

  // Recursively fix items
  if (schema.items) {
    schema = { ...schema, items: fixArraySchemas(schema.items) };
  }

  return schema;
};

// Fix the metric schema and convert to Zod
const fixedMetricSchema = fixArraySchemas(metricSchema);
const zodMetricSchema = jsonSchemaToZod(fixedMetricSchema);

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
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
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

    const systemPrompt = `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${
      state.chartType
    } visualization based on the provided schema and ES|QL query.

Schema for ${state.chartType}:
${JSON.stringify(state.schema, null, 2)}

${state.existingConfig ? `Existing configuration to modify: ${state.existingConfig}` : ''}

IMPORTANT RULES:
1. The 'dataset' field must contain: { type: "esql", query: "<the provided ES|QL query>" }
2. always use { operation: 'value', column: '<esql column name>', ...other options } for operations
3. All field names must match those available in the ES|QL query result
4. Make sure to follow schema definition strictly`;

    const messages: BaseMessage[] = [
      new HumanMessage(systemPrompt),
      new HumanMessage(`User query: ${state.nlQuery}

ES|QL query: ${state.esqlQuery}

Generate the ${state.chartType} visualization configuration.`),
      ...state.messages,
    ];

    try {
      // Use withStructuredOutput with zodMetricSchema
      logger.debug(`Using zodMetricSchema for structured output`);

      const structuredModel = model.chatModel.withStructuredOutput(zodMetricSchema, {
        name: 'extract',
      });
      const configResponse = await structuredModel.invoke(messages);

      return {
        messages: [new AIMessage(JSON.stringify(configResponse))],
        attemptCount,
      };
    } catch (error) {
      // If structured output fails, log and return error message for retry
      logger.warn(
        `Structured output generation failed (attempt ${attemptCount}/${MAX_RETRY_ATTEMPTS}): ${error.message}`
      );
      logger.debug(`Full error: ${JSON.stringify(error, null, 2)}`);
      return {
        messages: [
          new AIMessage(
            JSON.stringify({
              error: `Failed to generate structured output: ${error.message}`,
            })
          ),
        ],
        attemptCount,
        error: error.message,
      };
    }
  };

  const validateConfigNode = async (state: VisualizationState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    let configStr = lastMessage.content.toString().trim();

    // Remove markdown code blocks if present
    configStr = configStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    try {
      const config = JSON.parse(configStr) as VisualizationConfig;

      // Check if the generation itself failed
      if ((config as any).error) {
        logger.warn(
          `Configuration generation failed (attempt ${state.attemptCount}/${MAX_RETRY_ATTEMPTS}): ${
            (config as any).error
          }`
        );
        return {
          validatedConfig: null,
          error: (config as any).error,
        };
      }

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
      `The configuration generation or validation failed with the following error:

${state.error}

Please fix the configuration and provide a corrected version that passes validation. Remember to follow the schema strictly.`
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
        const schema = metricSchema;

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
