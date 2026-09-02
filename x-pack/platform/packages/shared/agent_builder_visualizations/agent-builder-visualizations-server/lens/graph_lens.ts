/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { extractTextFromMessage } from '../utils/extract_text_from_message';
import { executeForAuthoring, tryExecuteForAuthoring } from '../shared/execute_for_authoring';
import { generateVisualizationEsql } from '../shared/generate_visualization_esql';
import { chartTypeRegistry } from './chart_type_registry';
import type { VisualizationConfig } from './chart_type_registry';
import {
  GENERATE_ESQL_NODE,
  GENERATE_CONFIG_NODE,
  VALIDATE_CONFIG_NODE,
  MAX_RETRY_ATTEMPTS,
  type Action,
  type GenerateEsqlAction,
  type GenerateConfigAction,
  type ValidateConfigAction,
  isGenerateEsqlAction,
  isGenerateConfigAction,
  isValidateConfigAction,
} from './actions_lens';
import { createGenerateConfigPrompt } from './prompts';

// Regex to extract JSON from markdown code blocks
const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

const parseConfigAuthoringResponse = (
  responseText: string
): { config: Record<string, unknown>; authoringNote?: string } => {
  const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
  const jsonText = jsonMatches.length > 0 ? jsonMatches[0][1].trim() : responseText.trim();
  const parsed = JSON.parse(jsonText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Response is not a valid JSON object');
  }

  const { config, authoring_note: authoringNote } = parsed as {
    config?: unknown;
    authoring_note?: unknown;
  };
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Response must include a valid "config" object');
  }
  const normalizedNote = typeof authoringNote === 'string' ? authoringNote.trim() : '';
  return {
    config: config as Record<string, unknown>,
    ...(normalizedNote ? { authoringNote: normalizedNote } : {}),
  };
};

const validateConfigForChartType = (
  chartType: SupportedChartType,
  config: unknown
): VisualizationConfig => chartTypeRegistry[chartType].schema.parse(config);

export interface EsqlDataSourceCarrier {
  data_source?: { type?: string; query?: string };
}

/**
 * Returns the objects that carry a `data_source` for this config shape:
 * XY-ESQL configs keep one `data_source` per layer; every other ESQL chart
 * (metric, gauge, tagcloud, ...) carries it on the config itself. Used both to
 * read existing queries (edits) and to inject the validated query (generation).
 */
export const getEsqlDataSourceCarriers = (config: unknown): EsqlDataSourceCarrier[] => {
  if (!config || typeof config !== 'object') return [];
  const { layers } = config as { layers?: unknown };
  return Array.isArray(layers)
    ? (layers as EsqlDataSourceCarrier[])
    : [config as EsqlDataSourceCarrier];
};

/**
 * Helper to extract ESQL queries from a visualization config.
 * Handles both single-dataset configs (metric, gauge, tagcloud) and layers-based configs (XY).
 * For XY charts with multiple layers, returns all unique ESQL queries.
 */
function getExistingEsqlQueries(config: VisualizationConfig | null): string[] {
  if (!config) return [];

  const queries: string[] = [];
  for (const carrier of getEsqlDataSourceCarriers(config)) {
    const dataSource = carrier.data_source;
    if (dataSource?.type === 'esql' && dataSource.query && !queries.includes(dataSource.query)) {
      queries.push(dataSource.query);
    }
  }

  return queries;
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
  columns: Annotation<EsqlEsqlColumnInfo[] | undefined>(),
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  validatedConfig: Annotation<VisualizationConfig | null>(),
  authoringNote: Annotation<string | null>(),
  error: Annotation<string | null>(),
});

type VisualizationState = typeof VisualizationStateAnnotation.State;

export const createVisualizationGraph = async (
  modelProvider: ModelProvider,
  logger: Logger,
  events: ToolEventEmitter,
  esClient: IScopedClusterClient
) => {
  const defaultModel = await modelProvider.getDefaultModel();

  // Resolve the ES|QL query and its result columns. A query may reference
  // time-picker params (?_tstart/?_tend); bind a default range so it runs
  // server-side. Kibana binds the live range at render time.
  const generateESQLNode = async (state: VisualizationState) => {
    let action: GenerateEsqlAction;
    try {
      let query = state.esqlQuery;
      let columns: EsqlEsqlColumnInfo[] | undefined;

      // A provided query is only trustworthy if it actually runs: the caller may
      // pass an LLM-invented query whose error (e.g. a type mismatch) AST
      // validation never catches. Execute it; if it throws, discard it and fall
      // through to self-correcting generation rather than author a config around
      // a query that can never render.
      if (query) {
        logger.debug('Validating provided ES|QL query for Lens visualization');
        const executed = await tryExecuteForAuthoring({
          query,
          esClient: esClient.asCurrentUser,
        });
        if (!executed.ok) {
          logger.warn(
            `Provided ES|QL query failed to execute (${executed.error}); regenerating a corrected query`
          );
          query = '';
        } else {
          columns = executed.columns;
        }
      }

      if (!query) {
        logger.debug('Generating ES|QL query for visualization');
        const generated = await generateVisualizationEsql({
          nlQuery: state.nlQuery,
          // On edit, seed generation with the existing per-layer queries so a
          // query-changing edit can modify them instead of being stuck with the
          // original columns.
          existingQueries: getExistingEsqlQueries(state.parsedExistingConfig),
          index: state.index,
          modelProvider,
          events,
          logger,
          esClient,
        });

        if (!generated.query) {
          action = {
            type: 'generate_esql',
            success: false,
            error: generated.error ?? 'No queries generated',
          };
          return {
            esqlQuery: state.esqlQuery,
            actions: [action],
          };
        }

        query = generated.query;
        logger.debug(`Generated ES|QL query: ${query}`);
        columns = generated.columns;
        if (!columns) {
          ({ columns } = await executeForAuthoring({
            query,
            esClient: esClient.asCurrentUser,
          }));
        }
      }

      action = {
        type: 'generate_esql',
        success: true,
        query,
        columns,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate ES|QL query: ${errorMessage}`);
      action = {
        type: 'generate_esql',
        success: false,
        error: errorMessage,
      };
    }

    return {
      esqlQuery: action.query ?? state.esqlQuery,
      columns: action.columns,
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
    const columns = lastGenerateEsqlAction?.columns ?? state.columns;

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

    const additionalContext = previousActionContext
      ? `Previous attempts:\n${previousActionContext}\n\nPlease fix the issues mentioned above.`
      : undefined;

    const prompt = createGenerateConfigPrompt({
      nlQuery: state.nlQuery,
      esqlQuery,
      columns,
      chartType: state.chartType,
      schema: state.schema,
      existingConfig: state.existingConfig,
      additionalContext,
    });

    let action: GenerateConfigAction;
    try {
      // Invoke model without schema validation
      const response = await defaultModel.chatModel.invoke(prompt);
      const responseText = extractTextFromMessage(response);
      const { config: configResponse, authoringNote } = parseConfigAuthoringResponse(responseText);

      // Pin the validated ES|QL query before config validation. ES|QL generation owns the query;
      // config generation only binds columns from it.
      if (esqlQuery) {
        for (const carrier of getEsqlDataSourceCarriers(configResponse)) {
          carrier.data_source = { type: 'esql', query: esqlQuery };
        }
      }

      action = {
        type: 'generate_config',
        success: true,
        config: configResponse,
        authoringNote,
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
        const validatedConfig = validateConfigForChartType(state.chartType, config);

        logger.debug('Configuration validated successfully');
        action = {
          type: 'validate_config',
          success: true,
          config: validatedConfig,
          authoringNote: lastGenerateAction.authoringNote,
          attempt,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
    const lastGenerateEsqlAction = [...state.actions].reverse().find(isGenerateEsqlAction);

    // Surface an ES|QL resolution failure (a query that was never generated, so
    // no config was attempted) so the caller gets the real root cause.
    const esqlError =
      lastGenerateEsqlAction && !lastGenerateEsqlAction.success
        ? `Could not resolve a valid ES|QL query for the visualization: ${
            lastGenerateEsqlAction.error ?? 'Unknown error'
          }`
        : null;

    return {
      validatedConfig: lastValidateAction?.success ? lastValidateAction.config : null,
      authoringNote: lastValidateAction?.success ? lastValidateAction.authoringNote ?? null : null,
      error: lastValidateAction?.success ? null : lastValidateAction?.error || esqlError,
      esqlQuery: lastGenerateEsqlAction?.query || state.esqlQuery,
    };
  };

  // Router: Check if we should retry or end after validation
  const shouldRetryRouter = (state: VisualizationState): string => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateConfigAction);

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

  // Router: A config authored without a query can never validate (data_source
  // is pinned from the generated query), so when ES|QL generation failed route
  // straight to finalize with the ES|QL error instead of burning config
  // generation retries.
  const afterGenerateEsqlRouter = (state: VisualizationState): string => {
    const lastGenerateEsqlAction = [...state.actions].reverse().find(isGenerateEsqlAction);
    if (!lastGenerateEsqlAction?.success) {
      logger.warn('ES|QL generation failed; finalizing without generating a config');
      return 'finalize';
    }
    return GENERATE_CONFIG_NODE;
  };

  // Build and compile the graph
  const graph = new StateGraph(VisualizationStateAnnotation)
    // Add nodes
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(GENERATE_CONFIG_NODE, generateConfigNode)
    .addNode(VALIDATE_CONFIG_NODE, validateConfigNode)
    .addNode('finalize', finalizeNode)
    .addEdge('__start__', GENERATE_ESQL_NODE)
    .addConditionalEdges(GENERATE_ESQL_NODE, afterGenerateEsqlRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      finalize: 'finalize',
    })
    .addEdge(GENERATE_CONFIG_NODE, VALIDATE_CONFIG_NODE)
    .addConditionalEdges(VALIDATE_CONFIG_NODE, shouldRetryRouter, {
      [GENERATE_CONFIG_NODE]: GENERATE_CONFIG_NODE,
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
