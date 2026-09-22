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
import { createVisualizationGraph, getExistingEsqlQueries } from './graph_lens';
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

interface BuildLensConfigParams {
  nlQuery: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  /**
   * Keep the existing ES|QL query and column bindings of
   * `parsedExistingConfig` instead of regenerating the query. Ignored when
   * `esql` is provided, since a provided query always takes precedence.
   */
  preserveESQL?: boolean;
  /**
   * Reauthor the presentation of `parsedExistingConfig` from the chart rules,
   * replacing custom styling. Otherwise only the requested changes are applied.
   */
  applyChartRules?: boolean;
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
  preserveESQL = false,
  applyChartRules = false,
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
  const graph = await createVisualizationGraph(modelProvider, logger, events, esClient);

  // A provided ES|QL query is handed to the graph as-is: its resolve node
  // executes the query (which subsumes syntax validation) and regenerates a
  // corrected one when execution fails. It therefore supersedes preserving
  // the existing query, which is only ever kept verbatim when it is the one
  // recovered from the configuration being edited.
  if (preserveESQL && esql) {
    logger.warn(
      'Both an ES|QL query and preserveESQL were given; the provided query takes precedence and the existing one is not preserved.'
    );
  }
  const keepsExistingEsql = preserveESQL && !esql;

  // Preserving ES|QL reuses the existing query. The graph re-pins every
  // layer's own data_source, so the first query only seeds the prompt.
  const [existingEsql] = keepsExistingEsql ? getExistingEsqlQueries(parsedExistingConfig) : [];
  if (keepsExistingEsql && !existingEsql) {
    throw new Error(
      'Preserving the ES|QL query requires an existing ES|QL-backed Lens configuration.'
    );
  }

  const finalState = await graph.invoke({
    nlQuery,
    index,
    chartType: selectedChartType,
    schema,
    existingConfig,
    parsedExistingConfig,
    preserveESQL: keepsExistingEsql,
    applyChartRules,
    esqlQuery: esql || existingEsql || '',
    currentAttempt: 0,
    actions: [],
    validatedConfig: null,
    error: null,
  });

  const { validatedConfig, authoringNote, error, currentAttempt, esqlQuery } = finalState;

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
    ...(authoringNote ? { authoringNote } : {}),
    esqlQuery,
  };
};
