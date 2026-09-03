/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';
import type { ChartIntent } from './intent';
import type { ProbedColumn } from './probe_columns';
import type { VisualizationConfig } from './types';

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));
const DEFAULT_COMPILE_ALLOW_LIST = Object.values(SupportedChartType);

const getExistingChartType = (
  existingConfig: VisualizationConfig | null
): SupportedChartType | undefined => {
  if (!existingConfig || !('type' in existingConfig)) {
    return undefined;
  }

  const { type } = existingConfig;
  return typeof type === 'string' && SUPPORTED_CHART_TYPES.has(type)
    ? (type as SupportedChartType)
    : undefined;
};

export interface BuildLensConfigParams {
  nlQuery: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  intent?: ChartIntent;
  title?: string;
  styleOverrides?: Record<string, unknown>;
  styleRequest?: string;
  pinnedQueries?: string[];
  compileAllowList?: SupportedChartType[];
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

interface BuildLensConfigResult {
  selectedChartType: SupportedChartType;
  validatedConfig: VisualizationConfig;
  authoringNote?: string;
  esqlQuery: string;
}

export const buildLensConfig = async ({
  nlQuery,
  index,
  chartType,
  esql,
  existingConfig,
  parsedExistingConfig = null,
  intent,
  title,
  styleOverrides,
  styleRequest,
  pinnedQueries,
  compileAllowList = DEFAULT_COMPILE_ALLOW_LIST,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildLensConfigParams): Promise<BuildLensConfigResult> => {
  const selectedChartType = chartType ?? getExistingChartType(parsedExistingConfig);
  if (!selectedChartType) {
    throw new Error(
      'A supported chart type is required when creating a Lens visualization or editing one without a supported existing chart type.'
    );
  }

  const graph = await createVisualizationGraph(modelProvider, logger, events, esClient);
  const esqlQuery = esql ?? pinnedQueries?.[0] ?? '';

  const finalState = await graph.invoke({
    nlQuery,
    index,
    chartType: selectedChartType,
    existingConfig,
    parsedExistingConfig,
    esqlQuery,
    columns: [] as ProbedColumn[],
    intent,
    title,
    styleOverrides,
    styleRequest,
    compileAllowList,
    validatedConfig: null,
    authoringNote: null,
    error: null,
  });

  const { validatedConfig, authoringNote, error } = finalState;

  if (!validatedConfig) {
    throw new Error(error || 'Failed to generate a valid visualization configuration.');
  }

  return {
    selectedChartType,
    validatedConfig,
    ...(authoringNote ? { authoringNote } : {}),
    esqlQuery: finalState.esqlQuery,
  };
};
