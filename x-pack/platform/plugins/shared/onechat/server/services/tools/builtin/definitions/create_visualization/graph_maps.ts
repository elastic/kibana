/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { ScopedModel } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import { mapAttributesSchema } from '@kbn/maps-plugin/server/content_management/schema/v1/map_attributes_schema/map_attributes_schema';
import { generateEsql, indexExplorer } from '@kbn/onechat-genai-utils';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { JsonSchema, SupportedChartType, MapConfig } from './types';
import {
  EXPLORE_INDICES_NODE,
  GENERATE_ESQL_NODE,
  GENERATE_CONFIG_NODE,
  VALIDATE_CONFIG_NODE,
  MAX_RETRY_ATTEMPTS,
  type Action,
  type ExploreIndicesAction,
  type RequestIndicesAction,
  type GenerateEsqlAction,
  type RequestEsqlAction,
  type GenerateConfigAction,
  type ValidateConfigAction,
  isExploreIndicesAction,
  isRequestIndicesAction,
  isGenerateEsqlAction,
  isRequestEsqlAction,
  isGenerateConfigAction,
  isValidateConfigAction,
} from './actions_maps';
import { createGenerateConfigPrompt } from './prompts';

const MapStateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  chartType: Annotation<SupportedChartType>(),
  schema: Annotation<JsonSchema>(),
  existingConfig: Annotation<string | undefined>(),
  parsedExistingConfig: Annotation<MapConfig | null>(),
  // internal
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  exploredIndices: Annotation<
    Record<string, Array<{ type: string; name: string; reason?: string }>>
  >({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  esqlQueries: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  validatedConfig: Annotation<MapConfig | null>(),
  error: Annotation<string | null>(),
});

type MapState = typeof MapStateAnnotation.State;

export const createMapGraph = (
  model: ScopedModel,
  logger: Logger,
  esClient: IScopedClusterClient
) => {
  // Node: Explore indices on demand
  const exploreIndicesNode = async (state: MapState) => {
    logger.debug('Exploring indices for map');

    // Get the last request_indices action to know what to explore
    const lastRequestAction = [...state.actions].reverse().find(isRequestIndicesAction);

    if (!lastRequestAction) {
      const action: ExploreIndicesAction = {
        type: 'explore_indices',
        success: false,
        requestId: 'unknown',
        description: 'No request found',
        error: 'No index exploration request found in actions',
      };
      return {
        actions: [action],
      };
    }

    let action: ExploreIndicesAction;
    try {
      const response = await indexExplorer({
        nlQuery: lastRequestAction.description,
        indexPattern: lastRequestAction.indexPattern || '*',
        limit: lastRequestAction.limit || 5,
        esClient: esClient.asCurrentUser,
        model,
      });

      if (!response.resources || response.resources.length === 0) {
        action = {
          type: 'explore_indices',
          success: false,
          requestId: lastRequestAction.requestId,
          description: lastRequestAction.description,
          error: 'No indices found',
        };
      } else {
        logger.debug(
          `Found ${response.resources.length} indices for ${lastRequestAction.requestId}`
        );
        action = {
          type: 'explore_indices',
          success: true,
          requestId: lastRequestAction.requestId,
          description: lastRequestAction.description,
          resources: response.resources.map((r) => ({
            type: r.type,
            name: r.name,
            reason: r.reason,
          })),
        };
      }
    } catch (error) {
      logger.error(`Failed to explore indices: ${error.message}`);
      action = {
        type: 'explore_indices',
        success: false,
        requestId: lastRequestAction.requestId,
        description: lastRequestAction.description,
        error: error.message,
      };
    }

    return {
      exploredIndices:
        action.success && action.resources ? { [action.requestId]: action.resources } : {},
      actions: [action],
    };
  };

  // Node: Generate ES|QL query on demand
  const generateESQLNode = async (state: MapState) => {
    logger.debug('Generating ES|QL query for map');

    // Get the last request_esql action to know what to generate
    const lastRequestAction = [...state.actions].reverse().find(isRequestEsqlAction);

    if (!lastRequestAction) {
      const action: GenerateEsqlAction = {
        type: 'generate_esql',
        success: false,
        queryId: 'unknown',
        description: 'No request found',
        error: 'No ES|QL request found in actions',
      };
      return {
        actions: [action],
      };
    }

    let action: GenerateEsqlAction;
    try {
      const generateEsqlResponse = await generateEsql({
        nlQuery: `${lastRequestAction.description}\n\nUser's overall request: ${state.nlQuery}`,
        model,
        esClient: esClient.asCurrentUser,
      });

      if (!generateEsqlResponse.queries || generateEsqlResponse.queries.length === 0) {
        action = {
          type: 'generate_esql',
          success: false,
          queryId: lastRequestAction.queryId,
          description: lastRequestAction.description,
          error: 'No queries generated',
        };
      } else {
        const esqlQuery = generateEsqlResponse.queries[0];
        logger.debug(`Generated ES|QL query for ${lastRequestAction.queryId}: ${esqlQuery}`);
        action = {
          type: 'generate_esql',
          success: true,
          queryId: lastRequestAction.queryId,
          description: lastRequestAction.description,
          query: esqlQuery,
        };
      }
    } catch (error) {
      logger.error(`Failed to generate ES|QL query: ${error.message}`);
      action = {
        type: 'generate_esql',
        success: false,
        queryId: lastRequestAction.queryId,
        description: lastRequestAction.description,
        error: error.message,
      };
    }

    return {
      esqlQueries: action.success && action.query ? { [action.queryId]: action.query } : {},
      actions: [action],
    };
  };
  // Node: Generate configuration
  const generateConfigNode = async (state: MapState) => {
    const attempt = state.currentAttempt + 1;
    logger.debug(`Generating map configuration (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

    // Build context from previous actions for retry attempts
    const previousActionContext = state.actions
      .filter(
        (action) =>
          isGenerateConfigAction(action) ||
          isValidateConfigAction(action) ||
          isExploreIndicesAction(action) ||
          isGenerateEsqlAction(action)
      )
      .map((action) => {
        if (isGenerateConfigAction(action)) {
          return `Previous generation attempt ${action.attempt}: ${
            action.success
              ? action.needsIndices
                ? `REQUESTED INDICES: ${action.needsIndices.description}`
                : action.needsEsql
                ? `REQUESTED ES|QL: ${action.needsEsql.description}`
                : 'SUCCESS'
              : `FAILED - ${action.error}`
          }`;
        }
        if (isValidateConfigAction(action)) {
          return `Validation attempt ${action.attempt}: ${
            action.success ? 'SUCCESS' : `FAILED - ${action.error}`
          }`;
        }
        if (isExploreIndicesAction(action)) {
          return `Index exploration for "${action.requestId}": ${
            action.success
              ? `SUCCESS - found ${action.resources?.length} indices`
              : `FAILED - ${action.error}`
          }`;
        }
        if (isGenerateEsqlAction(action)) {
          return `ES|QL generation for "${action.queryId}": ${
            action.success ? `SUCCESS - query: ${action.query}` : `FAILED - ${action.error}`
          }`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    // Format available explored indices
    const availableIndicesContext = Object.keys(state.exploredIndices).length
      ? `\n\nAvailable explored indices:\n${Object.entries(state.exploredIndices)
          .map(
            ([id, resources]) =>
              `- ${id}: ${resources.map((r) => `${r.name} (${r.type})`).join(', ')}`
          )
          .join('\n')}`
      : '';

    // Format available ES|QL queries
    const availableEsqlContext = Object.keys(state.esqlQueries).length
      ? `\n\nAvailable ES|QL queries:\n${Object.entries(state.esqlQueries)
          .map(([id, query]) => `- ${id}: ${query}`)
          .join('\n')}`
      : '';

    const additionalInstructions = `IMPORTANT RULES:
1. Generate a valid map configuration following the schema strictly
2. All required fields must be present
3. Use appropriate layer configurations for the map type requested
4. If you need to find indices/datastreams for non-ES|QL layers, you can request index exploration
5. If you need ES|QL data for your map layers, you can request ES|QL generation${availableIndicesContext}${availableEsqlContext}`;

    const additionalContext = previousActionContext
      ? `Previous attempts:\n${previousActionContext}\n\nPlease fix the issues mentioned above.`
      : undefined;

    const prompt = createGenerateConfigPrompt({
      nlQuery: state.nlQuery,
      chartType: state.chartType,
      schema: state.schema,
      existingConfig: state.existingConfig,
      additionalInstructions,
      additionalContext,
    });

    let action: GenerateConfigAction;
    try {
      // Define a schema that allows LLM to return config, request indices, or request ES|QL
      const responseSchema = z.object({
        type: z.enum(['config', 'request_indices', 'request_esql']).describe('Type of response'),
        config: z.any().optional().describe('The map configuration (if type is config)'),
        requestIndices: z
          .object({
            requestId: z.string().describe('Unique identifier for this index exploration request'),
            description: z
              .string()
              .describe('Description of what indices to look for (natural language)'),
            indexPattern: z
              .string()
              .optional()
              .describe('Optional index pattern to filter by (e.g. "logs-*")'),
            limit: z.number().optional().describe('Max number of indices to return (default: 5)'),
          })
          .optional()
          .describe('Index exploration request details (if type is request_indices)'),
        requestEsql: z
          .object({
            queryId: z.string().describe('Unique identifier for this ES|QL query'),
            description: z.string().describe('Description of what data this query should fetch'),
          })
          .optional()
          .describe('ES|QL request details (if type is request_esql)'),
      });

      const structuredModel = model.chatModel.withStructuredOutput(responseSchema, {
        name: 'generate_config_or_request_data',
      });
      const response = await structuredModel.invoke(prompt);

      if (response.type === 'request_indices' && response.requestIndices) {
        // LLM is requesting index exploration
        logger.debug(
          `LLM requested index exploration: ${response.requestIndices.requestId} - ${response.requestIndices.description}`
        );
        const requestAction: RequestIndicesAction = {
          type: 'request_indices',
          requestId: response.requestIndices.requestId,
          description: response.requestIndices.description,
          indexPattern: response.requestIndices.indexPattern,
          limit: response.requestIndices.limit,
          attempt,
        };
        action = {
          type: 'generate_config',
          success: true,
          needsIndices: requestAction,
          attempt,
        };
      } else if (response.type === 'request_esql' && response.requestEsql) {
        // LLM is requesting ES|QL generation
        logger.debug(
          `LLM requested ES|QL: ${response.requestEsql.queryId} - ${response.requestEsql.description}`
        );
        const requestAction: RequestEsqlAction = {
          type: 'request_esql',
          queryId: response.requestEsql.queryId,
          description: response.requestEsql.description,
          attempt,
        };
        action = {
          type: 'generate_config',
          success: true,
          needsEsql: requestAction,
          attempt,
        };
      } else if (response.type === 'config' && response.config) {
        // LLM returned a config
        action = {
          type: 'generate_config',
          success: true,
          config: response.config,
          attempt,
        };
      } else {
        throw new Error('Invalid response type or missing required fields');
      }
    } catch (error) {
      logger.warn(
        `Structured output generation failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${error.message}`
      );
      logger.debug(`Full error details: ${JSON.stringify(error, null, 2)}`);

      action = {
        type: 'generate_config',
        success: false,
        attempt,
        error: error.message,
      };
    }

    return {
      currentAttempt: attempt,
      actions: action.needsIndices
        ? [action.needsIndices, action]
        : action.needsEsql
        ? [action.needsEsql, action]
        : [action],
    };
  };

  // Node: Validate configuration
  const validateConfigNode = async (state: MapState) => {
    const attempt = state.currentAttempt;
    logger.debug(`Validating map configuration (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

    // Get the last generate_config action
    const lastGenerateAction = [...state.actions].reverse().find(isGenerateConfigAction);

    if (!lastGenerateAction || !lastGenerateAction.config) {
      const action: ValidateConfigAction = {
        type: 'validate_config',
        success: false,
        attempt,
        error: 'No configuration found to validate',
      };
      return {
        actions: [action],
      };
    }

    let action: ValidateConfigAction;
    try {
      const config = lastGenerateAction.config;

      // Check if the generation itself failed
      if ('error' in config && typeof config.error === 'string') {
        logger.warn(`Configuration generation reported error: ${config.error}`);
        action = {
          type: 'validate_config',
          success: false,
          attempt,
          error: config.error,
        };
      } else {
        // Validate configuration using mapAttributesSchema
        const validatedConfig = mapAttributesSchema.validate(config);

        logger.debug('Map configuration validated successfully');
        logger.debug('Validated config', config);
        action = {
          type: 'validate_config',
          success: true,
          config: validatedConfig,
          attempt,
        };
      }
    } catch (error) {
      const errorMessage = error.message;
      logger.warn(`Map configuration validation failed: ${errorMessage}`);

      action = {
        type: 'validate_config',
        success: false,
        attempt,
        error: errorMessage,
      };
    }

    return {
      actions: [action],
    };
  };

  // Node: Finalize - extract outputs from actions
  const finalizeNode = async (state: MapState) => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateConfigAction);

    return {
      validatedConfig: lastValidateAction?.success ? lastValidateAction.config : null,
      error: lastValidateAction?.success ? null : lastValidateAction?.error || null,
    };
  };

  // Router: After config generation, check if indices or ES|QL is needed or go to validation
  const afterGenerateConfigRouter = (state: MapState): string => {
    const lastGenerateAction = [...state.actions].reverse().find(isGenerateConfigAction);

    if (!lastGenerateAction) {
      logger.warn('No generate config action found, going to validation');
      return VALIDATE_CONFIG_NODE;
    }

    // If LLM requested index exploration, go explore indices
    if (lastGenerateAction.needsIndices) {
      logger.debug(
        `Index exploration requested: ${lastGenerateAction.needsIndices.requestId}, routing to index exploration`
      );
      return EXPLORE_INDICES_NODE;
    }

    // If LLM requested ES|QL, go generate it
    if (lastGenerateAction.needsEsql) {
      logger.debug(
        `ES|QL requested: ${lastGenerateAction.needsEsql.queryId}, routing to ES|QL generation`
      );
      return GENERATE_ESQL_NODE;
    }

    // If generation failed, go to validation (which will trigger retry)
    if (!lastGenerateAction.success) {
      logger.debug('Config generation failed, going to validation');
      return VALIDATE_CONFIG_NODE;
    }

    // Otherwise, we have a config, go validate it
    logger.debug('Config generated successfully, going to validation');
    return VALIDATE_CONFIG_NODE;
  };

  // Router: Check if we should retry or end after validation
  const shouldRetryRouter = (state: MapState): string => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateConfigAction);

    // Success case - configuration is valid
    if (lastValidateAction?.success) {
      logger.debug('Map configuration validated successfully, finalizing');
      return 'finalize';
    }

    // Failure case - max attempts reached
    if (state.currentAttempt >= MAX_RETRY_ATTEMPTS) {
      logger.warn(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached, finalizing`);
      return 'finalize';
    }

    // Retry case - loop back to generate with previous actions providing context
    logger.debug(
      `Retry ${state.currentAttempt}/${MAX_RETRY_ATTEMPTS}, generating again with action context`
    );
    return GENERATE_CONFIG_NODE;
  };

  // Build and compile the graph
  const graph = new StateGraph(MapStateAnnotation)
    // Add nodes
    .addNode(EXPLORE_INDICES_NODE, exploreIndicesNode)
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(GENERATE_CONFIG_NODE, generateConfigNode)
    .addNode(VALIDATE_CONFIG_NODE, validateConfigNode)
    .addNode('finalize', finalizeNode)
    // Add edges
    .addEdge('__start__', GENERATE_CONFIG_NODE)
    .addConditionalEdges(GENERATE_CONFIG_NODE, afterGenerateConfigRouter, {
      [EXPLORE_INDICES_NODE]: EXPLORE_INDICES_NODE,
      [GENERATE_ESQL_NODE]: GENERATE_ESQL_NODE,
      [VALIDATE_CONFIG_NODE]: VALIDATE_CONFIG_NODE,
    })
    .addEdge(EXPLORE_INDICES_NODE, GENERATE_CONFIG_NODE)
    .addEdge(GENERATE_ESQL_NODE, GENERATE_CONFIG_NODE)
    .addConditionalEdges(VALIDATE_CONFIG_NODE, shouldRetryRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
