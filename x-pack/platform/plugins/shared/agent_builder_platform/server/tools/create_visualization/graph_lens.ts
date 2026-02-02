/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { gaugeStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import { tagcloudStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';
import { xyStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/xy';
import { regionMapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/region_map';
import { heatmapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/heatmap';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { extractTextContent } from '@kbn/agent-builder-genai-utils/langchain';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { VisualizationConfig } from './types';
import {
  GENERATE_ESQL_NODE,
  GENERATE_CONFIG_NODE,
  VALIDATE_CONFIG_NODE,
  MAX_RETRY_ATTEMPTS,
  type Action,
  type GenerateEsqlAction,
  type GenerateConfigAction,
  type ValidateConfigAction,
  isGenerateConfigAction,
  isValidateConfigAction,
} from './actions_lens';
import { createGenerateConfigPrompt } from './prompts';

// Regex to extract JSON from markdown code blocks
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

/**
 * Helper to extract ESQL queries from a visualization config.
 * Handles both single-dataset configs (metric, gauge, tagcloud) and layers-based configs (XY).
 * For XY charts with multiple layers, returns all unique ESQL queries.
 */
function getExistingEsqlQueries(config: VisualizationConfig | null): string[] {
  if (!config) return [];

  const queries: string[] = [];

  // For XY charts, check all layers' datasets
  if ('layers' in config && Array.isArray(config.layers)) {
    for (const layer of config.layers) {
      if (layer && 'dataset' in layer && layer.dataset) {
        const dataset = layer.dataset as { type?: string; query?: string };
        if (dataset.type === 'esql' && dataset.query && !queries.includes(dataset.query)) {
          queries.push(dataset.query);
        }
      }
    }
    return queries;
  }

  // For single-dataset configs (metric, gauge, tagcloud)
  if ('dataset' in config && config.dataset) {
    const dataset = config.dataset as { type?: string; query?: string };
    if (dataset.type === 'esql' && dataset.query) {
      queries.push(dataset.query);
    }
  }

  return queries;
}

/**
 * Helper to get a single existing ESQL query (for backward compatibility).
 * Returns the first query if multiple exist.
 */
function getExistingEsqlQuery(config: VisualizationConfig | null): string | null {
  const queries = getExistingEsqlQueries(config);
  return queries.length > 0 ? queries[0] : null;
}

const VisualizationStateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  index: Annotation<string | undefined>(),
  chartType: Annotation<SupportedChartType>(),
  schema: Annotation<object>(),
  existingConfig: Annotation<string | undefined>(),
  parsedExistingConfig: Annotation<VisualizationConfig | null>(),
  // internal
  esqlQuery: Annotation<string>(),
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  validatedConfig: Annotation<VisualizationConfig | null>(),
  error: Annotation<string | null>(),
});

type VisualizationState = typeof VisualizationStateAnnotation.State;

export const createVisualizationGraph = (
  model: ScopedModel,
  logger: Logger,
  events: ToolEventEmitter,
  esClient: IScopedClusterClient
) => {
  // Node: Generate ES|QL query
  const generateESQLNode = async (state: VisualizationState) => {
    logger.debug('Generating ES|QL query for visualization');

    let action: GenerateEsqlAction;
    try {
      const existingQueries = getExistingEsqlQueries(state.parsedExistingConfig);

      let nlQueryWithContext = state.nlQuery;
      if (existingQueries.length > 0) {
        if (existingQueries.length === 1) {
          nlQueryWithContext = `Existing esql query to modify: "${existingQueries[0]}"\n\nUser query: ${state.nlQuery}`;
        } else {
          const queriesContext = existingQueries.map((q, i) => `Layer ${i + 1}: "${q}"`).join('\n');
          nlQueryWithContext = `Existing esql queries from multiple layers:\n${queriesContext}\n\nUser query: ${state.nlQuery}`;
        }
      }

      const generateEsqlResponse = await generateEsql({
        nlQuery: nlQueryWithContext,
        index: state.index,
        model,
        events,
        logger,
        esClient: esClient.asCurrentUser,
      });

      if (!generateEsqlResponse.query) {
        action = {
          type: 'generate_esql',
          success: false,
          error: 'No queries generated',
        };
      } else {
        const esqlQuery = generateEsqlResponse.query;
        logger.debug(`Generated ES|QL query: ${esqlQuery}`);
        action = {
          type: 'generate_esql',
          success: true,
          query: esqlQuery,
        };
      }
    } catch (error) {
      logger.error(`Failed to generate ES|QL query: ${error.message}`);
      action = {
        type: 'generate_esql',
        success: false,
        error: error.message,
      };
    }

    return {
      actions: [action],
    };
  };

  // Node: Generate configuration
  const generateConfigNode = async (state: VisualizationState) => {
    const attempt = state.currentAttempt + 1;
    logger.debug(
      `Generating visualization configuration (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`
    );

    // Extract ES|QL query from previous actions
    const lastGenerateEsqlAction = state.actions
      .filter((action): action is GenerateEsqlAction => action.type === 'generate_esql')
      .filter((action) => action.success && action.query)
      .pop();
    const esqlQuery = lastGenerateEsqlAction?.query || state.esqlQuery;

    // Build context from previous actions for retry attempts
    const previousActionContext = state.actions
      .filter((action) => isGenerateConfigAction(action) || isValidateConfigAction(action))
      .map((action) => {
        if (isGenerateConfigAction(action)) {
          return `Previous generation attempt ${action.attempt}: ${
            action.success ? 'SUCCESS' : `FAILED - ${action.error}`
          }`;
        }
        if (isValidateConfigAction(action)) {
          return `Validation attempt ${action.attempt}: ${
            action.success ? 'SUCCESS' : `FAILED - ${action.error}`
          }`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    const additionalInstructions = `IMPORTANT RULES:
1. The 'dataset' field must contain: { type: "esql", query: "${esqlQuery}" }
2. Always use { operation: 'value', column: '<esql column name>', ...other options } for operations
3. All field names must match those available in the ES|QL query result
4. Follow the schema definition strictly`;

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
      // Invoke model without schema validation
      const response = await model.chatModel.invoke(prompt);
      const responseText = extractTextContent(response);

      // Try to extract JSON from markdown code blocks
      const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
      let configResponse: any;

      if (jsonMatches.length > 0) {
        const jsonText = jsonMatches[0][1].trim();
        configResponse = JSON.parse(jsonText);
      } else {
        configResponse = JSON.parse(responseText);
      }

      // Verify it's a valid object
      if (!configResponse || typeof configResponse !== 'object') {
        throw new Error('Response is not a valid JSON object');
      }

      action = {
        type: 'generate_config',
        success: true,
        config: configResponse,
        attempt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Config generation failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${errorMessage}`
      );
      logger.debug(`Full error details: ${JSON.stringify(error, null, 2)}`);

      action = {
        type: 'generate_config',
        success: false,
        attempt,
        error: errorMessage,
      };
    }

    return {
      currentAttempt: attempt,
      actions: [action],
    };
  };

  // Node: Validate configuration
  const validateConfigNode = async (state: VisualizationState) => {
    const attempt = state.currentAttempt;
    logger.debug(`Validating configuration (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

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
        // Validate configuration based on chart type
        let validatedConfig: VisualizationConfig | null = null;
        if (state.chartType === SupportedChartType.Metric) {
          validatedConfig = esqlMetricState.validate(config);
        } else if (state.chartType === SupportedChartType.Gauge) {
          validatedConfig = gaugeStateSchemaESQL.validate(config);
        } else if (state.chartType === SupportedChartType.Tagcloud) {
          validatedConfig = tagcloudStateSchemaESQL.validate(config);
        } else if (state.chartType === SupportedChartType.XY) {
          validatedConfig = xyStateSchema.validate(config);
        } else if (state.chartType === SupportedChartType.RegionMap) {
          validatedConfig = regionMapStateSchemaESQL.validate(config);
        } else if (state.chartType === SupportedChartType.Heatmap) {
          validatedConfig = heatmapStateSchemaESQL.validate(config);
        } else {
          throw new Error(`Unsupported chart type: ${state.chartType}`);
        }

        logger.debug('Configuration validated successfully');
        action = {
          type: 'validate_config',
          success: true,
          config: validatedConfig,
          attempt,
        };
      }
    } catch (error) {
      const errorMessage = error.message;
      logger.warn(`Configuration validation failed: ${errorMessage}`);

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
  const finalizeNode = async (state: VisualizationState) => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateConfigAction);
    const lastGenerateEsqlAction = [...state.actions]
      .reverse()
      .find((action): action is GenerateEsqlAction => action.type === 'generate_esql');

    return {
      validatedConfig: lastValidateAction?.success ? lastValidateAction.config : null,
      error: lastValidateAction?.success ? null : lastValidateAction?.error || null,
      esqlQuery: lastGenerateEsqlAction?.query,
    };
  };

  // Router: Check if we should retry or end after validation
  const shouldRetryRouter = (state: VisualizationState): string => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateConfigAction);

    // Success case - configuration is valid
    if (lastValidateAction?.success) {
      logger.debug('Configuration validated successfully, finalizing');
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

  // Router: Decide whether to generate ESQL or use existing
  const shouldGenerateESQLRouter = (state: VisualizationState): string => {
    // If we have existing config with a query, skip ES|QL generation
    const existingQuery = getExistingEsqlQuery(state.parsedExistingConfig);
    if (existingQuery) {
      logger.debug('Using existing ES|QL query from parsed config');
      return GENERATE_CONFIG_NODE;
    }

    logger.debug('No existing query found, generating new ES|QL query');
    return GENERATE_ESQL_NODE;
  };

  // Build and compile the graph
  const graph = new StateGraph(VisualizationStateAnnotation)
    // Add nodes
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(GENERATE_CONFIG_NODE, generateConfigNode)
    .addNode(VALIDATE_CONFIG_NODE, validateConfigNode)
    .addNode('finalize', finalizeNode)
    // Add edges
    .addConditionalEdges('__start__', shouldGenerateESQLRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      [GENERATE_ESQL_NODE]: GENERATE_ESQL_NODE,
    })
    .addEdge(GENERATE_ESQL_NODE, GENERATE_CONFIG_NODE)
    .addEdge(GENERATE_CONFIG_NODE, VALIDATE_CONFIG_NODE)
    .addConditionalEdges(VALIDATE_CONFIG_NODE, shouldRetryRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
