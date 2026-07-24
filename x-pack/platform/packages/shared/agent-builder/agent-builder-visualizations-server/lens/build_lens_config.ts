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
import { validateEsqlQuery } from '@kbn/agent-builder-genai-utils';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import { createVisualizationGraph } from './graph_lens';
import { getSchemaForChartType } from './schemas';
import type { VisualizationConfig } from './types';

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

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
  includeTimeRange?: boolean;
  additionalChartConfigInstructions?: string;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

interface BuildLensConfigResult {
  selectedChartType: SupportedChartType;
  validatedConfig: VisualizationConfig;
  esqlQuery: string;
  timeRange?: { from: string; to: string };
}

export const buildLensConfig = async ({
  nlQuery,
  index,
  chartType,
  esql,
  existingConfig,
  parsedExistingConfig = null,
  includeTimeRange = true,
  additionalChartConfigInstructions,
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

  const schema = getSchemaForChartType(selectedChartType);
  const graph = await createVisualizationGraph(
    modelProvider,
    logger,
    events,
    esClient,
    includeTimeRange,
    additionalChartConfigInstructions
  );

  // If the user provides ES|QL, use it only when validation says it is safe.
  // If validation cannot run, keep the query and let the next step handle it.
  let providedEsql = esql;
  if (providedEsql) {
    let validationError: string | undefined;
    try {
      validationError = await validateEsqlQuery(
        providedEsql,
        buildServerESQLCallbacks({ client: esClient.asCurrentUser })
      );
    } catch {
      // Couldn't validate, keep it.
    }
    if (validationError) {
      logger.warn(
        `Provided ES|QL failed validation; regenerating from the natural-language query. Error: ${validationError}`
      );
      providedEsql = undefined;
    }
  }

  const finalState = await graph.invoke({
    nlQuery,
    index,
    chartType: selectedChartType,
    schema,
    existingConfig,
    parsedExistingConfig,
    esqlQuery: providedEsql || '',
    currentAttempt: 0,
    actions: [],
    validatedConfig: null,
    error: null,
  });

  const { validatedConfig, error, currentAttempt, esqlQuery, timeRange } = finalState;

  if (!validatedConfig) {
    throw new Error(
      `Failed to generate valid configuration after ${currentAttempt} attempts. Last error: ${
        error || 'Unknown error'
      }`
    );
  }

  return {
    selectedChartType,
    validatedConfig,
    esqlQuery,
    ...(timeRange && { timeRange }),
  };
};
