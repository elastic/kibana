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
import { generateEsql } from '@kbn/onechat-genai-utils';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { JsonSchema, SupportedChartType, MapConfig } from './types';
import {
  EXPLORE_DATAVIEWS_NODE,
  GENERATE_ESQL_NODE,
  GENERATE_CONFIG_NODE,
  VALIDATE_CONFIG_NODE,
  MAX_RETRY_ATTEMPTS,
  type Action,
  type ExploreDataViewsAction,
  type RequestDataViewsAction,
  type GenerateEsqlAction,
  type RequestEsqlAction,
  type GenerateConfigAction,
  type ValidateConfigAction,
  isExploreDataViewsAction,
  isRequestDataViewsAction,
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
  exploredDataViews: Annotation<
    Record<string, Array<{ id: string; title: string; reason?: string }>>
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
  esClient: IScopedClusterClient,
  dataViewsService: DataViewsService
) => {
  // Node: Explore data views on demand
  const exploreDataViewsNode = async (state: MapState) => {
    logger.debug('Exploring data views for map');

    // Get the last request_dataviews action to know what to explore
    const lastRequestAction = [...state.actions].reverse().find(isRequestDataViewsAction);

    if (!lastRequestAction) {
      const action: ExploreDataViewsAction = {
        type: 'explore_dataviews',
        success: false,
        requestId: 'unknown',
        description: 'No request found',
        error: 'No data view exploration request found in actions',
      };
      return {
        actions: [action],
      };
    }

    let action: ExploreDataViewsAction;
    try {
      // Get all data views
      let dataViews = await dataViewsService.getIdsWithTitle();

      // Filter by pattern if provided
      if (lastRequestAction.pattern) {
        const regexPattern = new RegExp(lastRequestAction.pattern.replace(/\*/g, '.*'));
        dataViews = dataViews.filter((dv) => regexPattern.test(dv.title));
      }

      // If no data views, return empty
      if (dataViews.length === 0) {
        action = {
          type: 'explore_dataviews',
          success: false,
          requestId: lastRequestAction.requestId,
          description: lastRequestAction.description,
          error: lastRequestAction.pattern
            ? `No data views found matching pattern: ${lastRequestAction.pattern}`
            : 'No data views found',
        };
      } else {
        // Use LLM to select most relevant data views
        const limit = lastRequestAction.limit || 5;
        const prompt = `Given the following Kibana data views, select the ${limit} most relevant one(s) for this query: "${
          lastRequestAction.description
        }"

Available data views:
${dataViews.map((dv) => `- ID: ${dv.id}, Title: ${dv.title}`).join('\n')}

Return ONLY a JSON array of objects with the selected data view IDs and a brief reason why each was selected.
Format: [{ "id": "data-view-id", "reason": "brief explanation" }]

Select up to ${limit} data view(s).`;

        try {
          const response = await model.chatModel.invoke([['user', prompt]]);
          const content =
            typeof response.content === 'string'
              ? response.content
              : JSON.stringify(response.content);

          // Extract JSON from markdown code blocks or plain text
          const jsonMatch =
            content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || content.match(/(\[[\s\S]*?\])/);

          if (!jsonMatch) {
            throw new Error('Failed to parse LLM response');
          }

          const selected = JSON.parse(jsonMatch[1]) as Array<{ id: string; reason: string }>;

          logger.debug(
            `Found ${selected.length} relevant data views for ${lastRequestAction.requestId}`
          );
          action = {
            type: 'explore_dataviews',
            success: true,
            requestId: lastRequestAction.requestId,
            description: lastRequestAction.description,
            resources: selected.slice(0, limit).map((item) => {
              const dv = dataViews.find((d) => d.id === item.id);
              return {
                id: item.id,
                title: dv?.title || 'Unknown',
                reason: item.reason,
              };
            }),
          };
        } catch (llmError) {
          logger.error(`Data view explorer LLM selection failed: ${llmError.message}`);

          // Fallback: return first N data views
          action = {
            type: 'explore_dataviews',
            success: true,
            requestId: lastRequestAction.requestId,
            description: lastRequestAction.description,
            resources: dataViews.slice(0, limit).map((dv) => ({
              id: dv.id,
              title: dv.title,
              reason: 'Selected by fallback (LLM selection failed)',
            })),
          };
        }
      }
    } catch (error) {
      logger.error(`Failed to explore data views: ${error.message}`);
      action = {
        type: 'explore_dataviews',
        success: false,
        requestId: lastRequestAction.requestId,
        description: lastRequestAction.description,
        error: error.message,
      };
    }

    return {
      exploredDataViews:
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
          isExploreDataViewsAction(action) ||
          isGenerateEsqlAction(action)
      )
      .map((action) => {
        if (isGenerateConfigAction(action)) {
          return `Previous generation attempt ${action.attempt}: ${
            action.success
              ? action.needsDataViews
                ? `REQUESTED DATA VIEWS: ${action.needsDataViews.description}`
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
        if (isExploreDataViewsAction(action)) {
          return `Data view exploration for "${action.requestId}": ${
            action.success
              ? `SUCCESS - found ${action.resources?.length} data views`
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

    // Format available explored data views
    const availableDataViewsContext = Object.keys(state.exploredDataViews).length
      ? `\n\nAvailable explored data views:\n${Object.entries(state.exploredDataViews)
          .map(
            ([id, resources]) =>
              `- ${id}: ${resources.map((r) => `${r.title} (${r.id})`).join(', ')}`
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
4. If you need to find data views for non-ES|QL layers, you can request data view exploration
5. If you need ES|QL data for your map layers, you can request ES|QL generation (AVOID ESQL WHEN POSSIBLE!)
6. When using data views, use the data view ID as the indexPatternId${availableDataViewsContext}${availableEsqlContext}
7. ALWWAYS add a base map layer`;

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
      // Define a schema that allows LLM to return config, request data views, or request ES|QL
      const responseSchema = z.object({
        type: z.enum(['config', 'request_dataviews', 'request_esql']).describe('Type of response'),
        config: z.any().optional().describe('The map configuration (if type is config)'),
        requestDataViews: z
          .object({
            requestId: z
              .string()
              .describe('Unique identifier for this data view exploration request'),
            description: z
              .string()
              .describe('Description of what data views to look for (natural language)'),
            pattern: z
              .string()
              .optional()
              .describe('Optional pattern to filter data views by title (e.g. "logs*")'),
            limit: z
              .number()
              .optional()
              .describe('Max number of data views to return (default: 5)'),
          })
          .optional()
          .describe('Data view exploration request details (if type is request_dataviews)'),
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

      if (response.type === 'request_dataviews' && response.requestDataViews) {
        // LLM is requesting data view exploration
        logger.debug(
          `LLM requested data view exploration: ${response.requestDataViews.requestId} - ${response.requestDataViews.description}`
        );
        const requestAction: RequestDataViewsAction = {
          type: 'request_dataviews',
          requestId: response.requestDataViews.requestId,
          description: response.requestDataViews.description,
          pattern: response.requestDataViews.pattern,
          limit: response.requestDataViews.limit,
          attempt,
        };
        action = {
          type: 'generate_config',
          success: true,
          needsDataViews: requestAction,
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
      actions: action.needsDataViews
        ? [action.needsDataViews, action]
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

  // Router: After config generation, check if data views or ES|QL is needed or go to validation
  const afterGenerateConfigRouter = (state: MapState): string => {
    const lastGenerateAction = [...state.actions].reverse().find(isGenerateConfigAction);

    if (!lastGenerateAction) {
      logger.warn('No generate config action found, going to validation');
      return VALIDATE_CONFIG_NODE;
    }

    // If LLM requested data view exploration, go explore data views
    if (lastGenerateAction.needsDataViews) {
      logger.debug(
        `Data view exploration requested: ${lastGenerateAction.needsDataViews.requestId}, routing to data view exploration`
      );
      return EXPLORE_DATAVIEWS_NODE;
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
    .addNode(EXPLORE_DATAVIEWS_NODE, exploreDataViewsNode)
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(GENERATE_CONFIG_NODE, generateConfigNode)
    .addNode(VALIDATE_CONFIG_NODE, validateConfigNode)
    .addNode('finalize', finalizeNode)
    // Add edges
    .addEdge('__start__', GENERATE_CONFIG_NODE)
    .addConditionalEdges(GENERATE_CONFIG_NODE, afterGenerateConfigRouter, {
      [EXPLORE_DATAVIEWS_NODE]: EXPLORE_DATAVIEWS_NODE,
      [GENERATE_ESQL_NODE]: GENERATE_ESQL_NODE,
      [VALIDATE_CONFIG_NODE]: VALIDATE_CONFIG_NODE,
    })
    .addEdge(EXPLORE_DATAVIEWS_NODE, GENERATE_CONFIG_NODE)
    .addEdge(GENERATE_ESQL_NODE, GENERATE_CONFIG_NODE)
    .addConditionalEdges(VALIDATE_CONFIG_NODE, shouldRetryRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
