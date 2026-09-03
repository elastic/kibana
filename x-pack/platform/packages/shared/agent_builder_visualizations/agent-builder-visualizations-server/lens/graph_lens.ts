/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { EsqlService } from '@kbn/esql-server-utils';
import { extractTextFromMessage } from '../utils/extract_text_from_message';
import { generateVisualizationEsql } from '../shared/generate_visualization_esql';
import { author, type AuthorInvoker } from './author';
import { fallbackBind } from './binder/fallback_bind';
import { classifyColumns } from './binder/classify_columns';
import { compileConfig, isCompileSuccess } from './compile/compile_config';
import { decompileConfig, isDecompileSuccess } from './decompile/decompile_config';
import { applyHouseStyle } from './house_style';
import type { ChartIntent } from './intent';
import { stripPanelLevelKeys } from './panel_level';
import { chartTypeRegistry } from './chart_type_registry';
import type { VisualizationConfig } from './chart_type_registry';
import { probeColumns, type ProbedColumn } from './probe_columns';
import {
  GENERATE_ESQL_NODE,
  PROBE_NODE,
  COMPILE_NODE,
  FINALIZE_NODE,
} from './actions_lens';

const DEFAULT_COMPILE_ALLOW_LIST = Object.values(SupportedChartType);

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

const getExistingEsqlQueries = (config: VisualizationConfig | null): string[] => {
  if (!config) return [];

  const queries: string[] = [];
  for (const carrier of getEsqlDataSourceCarriers(config)) {
    const dataSource = carrier.data_source;
    if (dataSource?.type === 'esql' && dataSource.query && !queries.includes(dataSource.query)) {
      queries.push(dataSource.query);
    }
  }

  return queries;
};

const VisualizationStateAnnotation = Annotation.Root({
  nlQuery: Annotation<string>(),
  index: Annotation<string | undefined>(),
  chartType: Annotation<SupportedChartType>(),
  existingConfig: Annotation<string | undefined>(),
  parsedExistingConfig: Annotation<VisualizationConfig | null>(),
  esqlQuery: Annotation<string>(),
  columns: Annotation<ProbedColumn[]>(),
  intent: Annotation<ChartIntent | undefined>(),
  title: Annotation<string | undefined>(),
  styleOverrides: Annotation<Record<string, unknown> | undefined>(),
  styleRequest: Annotation<string | undefined>(),
  compileAllowList: Annotation<SupportedChartType[]>(),
  validatedConfig: Annotation<VisualizationConfig | null>(),
  authoringNote: Annotation<string | null>(),
  error: Annotation<string | null>(),
});

type VisualizationState = typeof VisualizationStateAnnotation.State;

type AmbiguousSlot = 'secondary' | 'breakdown' | 'x' | 'ems' | 'collapse';

type CompileDispatchResult =
  | { status: 'ok'; config: Record<string, unknown>; authoringNote: string | null }
  | { status: 'error'; error: string };

const isAmbiguousSlot = (slot: string): slot is AmbiguousSlot =>
  slot === 'secondary' ||
  slot === 'breakdown' ||
  slot === 'x' ||
  slot === 'ems' ||
  slot === 'collapse';

const formatClassifiedColumns = (query: string, columns: ProbedColumn[]): string => {
  const classified = classifyColumns(query, columns);
  return classified.columns
    .map((column) => `- "${column.name}" (${column.type}, ${column.role})`)
    .join('\n');
};

const bindFailure = (message: string, query: string, columns: ProbedColumn[]): string =>
  `${message}\nClassified columns:\n${formatClassifiedColumns(query, columns)}`;

const formatZodError = (error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

const slotIsHinted = (intent: ChartIntent | undefined, slot: AmbiguousSlot): boolean => {
  switch (slot) {
    case 'secondary':
      return Boolean(intent?.secondary?.column);
    case 'breakdown':
    case 'collapse':
      return Boolean(intent?.breakdown_field);
    case 'x':
      return Boolean(intent?.x_field);
    case 'ems':
      return Boolean(intent?.region);
    default: {
      const exhaustive: never = slot;
      return exhaustive;
    }
  }
};

const applySlotHint = (
  intent: ChartIntent | undefined,
  slot: AmbiguousSlot,
  column: string
): ChartIntent => {
  const next: ChartIntent = { ...intent };
  switch (slot) {
    case 'secondary':
      return { ...next, secondary: { ...next.secondary, column } };
    case 'breakdown':
    case 'collapse':
      return { ...next, breakdown_field: column };
    case 'x':
      return { ...next, x_field: column };
    case 'ems':
      return { ...next, region: { boundaries: 'world_countries', join: 'iso2' } };
    default: {
      const exhaustive: never = slot;
      return exhaustive;
    }
  }
};

const prepareEditInput = (
  state: VisualizationState
): {
  mode: 'new' | 'edit';
  intent: ChartIntent | undefined;
  styleOverrides: Record<string, unknown> | undefined;
} => {
  if (!state.parsedExistingConfig) {
    return {
      mode: 'new',
      intent: state.intent,
      styleOverrides: state.styleOverrides,
    };
  }
  const decompiled = decompileConfig(state.parsedExistingConfig as Record<string, unknown>);
  if (!isDecompileSuccess(decompiled)) {
    return {
      mode: 'edit',
      intent: state.intent,
      styleOverrides: state.styleOverrides,
    };
  }
  const intent = { ...decompiled.intent, ...state.intent };
  const styleOverrides =
    state.chartType === decompiled.chartType
      ? { ...decompiled.overrides, ...state.styleOverrides }
      : state.styleOverrides;
  return { mode: 'edit', intent, styleOverrides };
};

const attachDataSource = (config: Record<string, unknown>, query: string): void => {
  for (const carrier of getEsqlDataSourceCarriers(config)) {
    carrier.data_source = { type: 'esql', query };
  }
};

export const createVisualizationGraph = async (
  modelProvider: ModelProvider,
  logger: Logger,
  events: ToolEventEmitter,
  esClient: IScopedClusterClient
) => {
  const invokeAuthor: AuthorInvoker = async (messages) => {
    const defaultModel = await modelProvider.getDefaultModel();
    return extractTextFromMessage(await defaultModel.chatModel.invoke(messages));
  };

  const generateESQLNode = async (state: VisualizationState) => {
    logger.debug('Generating ES|QL query for visualization');

    try {
      const generated = await generateVisualizationEsql({
        nlQuery: state.nlQuery,
        existingQueries: getExistingEsqlQueries(state.parsedExistingConfig),
        index: state.index,
        modelProvider,
        events,
        logger,
        esClient,
      });

      if (!generated.query) {
        return {
          error: `Could not resolve a valid ES|QL query for the visualization: ${
            generated.error ?? 'No queries generated'
          }`,
        };
      }

      logger.debug(`Generated ES|QL query: ${generated.query}`);
      return { esqlQuery: generated.query, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate ES|QL query: ${errorMessage}`);
      return {
        error: `Could not resolve a valid ES|QL query for the visualization: ${errorMessage}`,
      };
    }
  };

  const probeNode = async (state: VisualizationState) => {
    logger.debug('Probing visualization query columns');
    try {
      const esqlService = new EsqlService({ client: esClient.asCurrentUser });
      const columns = await probeColumns(state.esqlQuery, async (query) => {
        const probed = await esqlService.getColumns(query);
        return probed.map((column) => ({ name: column.name, type: column.type }));
      });
      return { columns, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to probe visualization columns: ${errorMessage}`);
      return {
        error: `Could not probe columns for the visualization query: ${errorMessage}`,
      };
    }
  };

  const finishWithOptionalStyle = async (
    state: VisualizationState,
    config: Record<string, unknown>,
    authoringNote: string | null
  ): Promise<CompileDispatchResult> => {
    if (!state.styleRequest) {
      return { status: 'ok', config, authoringNote };
    }
    const styled = await author(
      {
        mode: 'style',
        chartType: state.chartType,
        compiledConfig: config,
        styleRequest: state.styleRequest,
      },
      invokeAuthor
    );
    if ('error' in styled) {
      return { status: 'error', error: styled.error };
    }
    return {
      status: 'ok',
      config: styled.config,
      authoringNote: styled.authoringNote ?? authoringNote,
    };
  };

  const authorFromScratch = async (
    state: VisualizationState
  ): Promise<CompileDispatchResult> => {
    const authored = await author(
      {
        mode: 'from_scratch',
        chartType: state.chartType,
        nlQuery: state.nlQuery,
        esqlQuery: state.esqlQuery,
        columns: state.columns,
        existingConfig: state.existingConfig,
      },
      invokeAuthor
    );
    if ('error' in authored) {
      return { status: 'error', error: authored.error };
    }

    const styled = applyHouseStyle(authored.config, {
      chartType: state.chartType,
      mode: 'new',
      rules: 'defects',
      colors: 'keep',
    });
    const live = styled.config;
    attachDataSource(live, state.esqlQuery);
    const stripped = stripPanelLevelKeys(structuredClone(live));
    const parsed = chartTypeRegistry[state.chartType].schema.safeParse(stripped.config);
    if (!parsed.success) {
      return { status: 'error', error: formatZodError(parsed.error) };
    }
    const merged = { ...live, ...styled.panelLevel, ...stripped.panelLevel };
    return finishWithOptionalStyle(state, merged, authored.authoringNote ?? null);
  };

  const dispatchCompile = async (state: VisualizationState): Promise<CompileDispatchResult> => {
    const allowList = state.compileAllowList ?? DEFAULT_COMPILE_ALLOW_LIST;
    if (!allowList.includes(state.chartType)) {
      return authorFromScratch(state);
    }

    const prepared = prepareEditInput(state);
    const compileParams = {
      chartType: state.chartType,
      query: state.esqlQuery,
      columns: state.columns,
      mode: prepared.mode,
      title: state.title,
      intent: prepared.intent,
      styleOverrides: prepared.styleOverrides,
      styleRequest: state.styleRequest,
    };

    const first = compileConfig(compileParams);
    if (isCompileSuccess(first)) {
      return finishWithOptionalStyle(state, first.config, null);
    }
    if ('error' in first) {
      return {
        status: 'error',
        error: bindFailure(first.error, state.esqlQuery, state.columns),
      };
    }

    if (!isAmbiguousSlot(first.ambiguous) || slotIsHinted(prepared.intent, first.ambiguous)) {
      return {
        status: 'error',
        error: bindFailure(
          `Could not bind ${first.ambiguous}`,
          state.esqlQuery,
          state.columns
        ),
      };
    }

    const classified = classifyColumns(state.esqlQuery, state.columns);
    const lowEffort = await modelProvider.selectModel({ effortLevel: 'low' });
    const fallback = await fallbackBind(
      {
        slot: first.ambiguous,
        candidates: first.candidates,
        columns: classified.columns,
      },
      async (prompt) =>
        extractTextFromMessage(
          await lowEffort.chatModel.invoke([
            ['system', prompt],
            ['human', 'Choose the column.'],
          ])
        )
    );
    if (!('column' in fallback)) {
      const message =
        'error' in fallback
          ? fallback.error
          : `Could not bind ${fallback.ambiguous}`;
      return {
        status: 'error',
        error: bindFailure(message, state.esqlQuery, state.columns),
      };
    }

    const second = compileConfig({
      ...compileParams,
      intent: applySlotHint(prepared.intent, first.ambiguous, fallback.column),
    });
    if (!isCompileSuccess(second)) {
      const message =
        'error' in second ? second.error : `Could not bind ${second.ambiguous}`;
      return {
        status: 'error',
        error: bindFailure(message, state.esqlQuery, state.columns),
      };
    }
    return finishWithOptionalStyle(state, second.config, null);
  };

  const compileNode = async (state: VisualizationState) => {
    logger.debug(`Compiling ${state.chartType} visualization`);
    const result = await dispatchCompile(state);
    if (result.status === 'ok') {
      return {
        validatedConfig: result.config as VisualizationConfig,
        authoringNote: result.authoringNote,
        error: null,
      };
    }
    return {
      validatedConfig: null,
      authoringNote: null,
      error: result.error,
    };
  };

  const finalizeNode = async (state: VisualizationState) => ({
    validatedConfig: state.validatedConfig ?? null,
    authoringNote: state.authoringNote ?? null,
    error: state.error ?? null,
    esqlQuery: state.esqlQuery,
  });

  const afterGenerateEsqlRouter = (state: VisualizationState): string => {
    if (state.error) {
      logger.warn('ES|QL generation failed; finalizing without compiling a config');
      return FINALIZE_NODE;
    }
    return PROBE_NODE;
  };

  const afterProbeRouter = (state: VisualizationState): string => {
    if (state.error) {
      logger.warn('Column probe failed; finalizing without compiling a config');
      return FINALIZE_NODE;
    }
    return COMPILE_NODE;
  };

  const shouldGenerateESQLRouter = (state: VisualizationState): string => {
    if (state.esqlQuery) {
      logger.debug('Using provided ES|QL query');
      return PROBE_NODE;
    }
    logger.debug('No ES|QL query provided, generating ES|QL query');
    return GENERATE_ESQL_NODE;
  };

  const graph = new StateGraph(VisualizationStateAnnotation)
    .addNode(GENERATE_ESQL_NODE, generateESQLNode)
    .addNode(PROBE_NODE, probeNode)
    .addNode(COMPILE_NODE, compileNode)
    .addNode(FINALIZE_NODE, finalizeNode)
    .addConditionalEdges('__start__', shouldGenerateESQLRouter, {
      [PROBE_NODE]: PROBE_NODE,
      [GENERATE_ESQL_NODE]: GENERATE_ESQL_NODE,
    })
    .addConditionalEdges(GENERATE_ESQL_NODE, afterGenerateEsqlRouter, {
      [PROBE_NODE]: PROBE_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addConditionalEdges(PROBE_NODE, afterProbeRouter, {
      [COMPILE_NODE]: COMPILE_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addEdge(COMPILE_NODE, FINALIZE_NODE)
    .addEdge(FINALIZE_NODE, '__end__')
    .compile();

  return graph;
};
