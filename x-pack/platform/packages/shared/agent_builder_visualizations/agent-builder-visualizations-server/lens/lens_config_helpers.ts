/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

export interface EsqlDataSourceCarrier {
  data_source?: { type?: string; query?: string };
}

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

/**
 * Returns the objects that carry a `data_source` for this config shape:
 * XY-ESQL configs keep one `data_source` per layer; every other ESQL chart
 * (metric, gauge, tagcloud, ...) carries it on the config itself. Used both to
 * read existing queries (edits) and to inject the validated query (generation).
 *
 * Package-internal: callers that only need the queries should use
 * {@link getEsqlQueriesFromLensConfig} rather than re-deriving them.
 */
export const getEsqlDataSourceCarriers = (config: unknown): EsqlDataSourceCarrier[] => {
  if (!config || typeof config !== 'object') return [];
  const { layers } = config as { layers?: unknown };
  return Array.isArray(layers)
    ? (layers as EsqlDataSourceCarrier[])
    : [config as EsqlDataSourceCarrier];
};

/**
 * Distinct ES|QL queries backing a Lens config, whether it stores one query on
 * the config itself or one per layer.
 */
export const getEsqlQueriesFromLensConfig = (config: unknown): string[] => {
  const queries = new Set<string>();

  for (const { data_source: dataSource } of getEsqlDataSourceCarriers(config)) {
    if (dataSource?.type === 'esql' && dataSource.query) {
      queries.add(dataSource.query);
    }
  }

  return [...queries];
};

/**
 * The Lens chart type on a config, when it is a supported Agent Builder chart
 * type. Returns `undefined` for missing, non-object, or unsupported configs.
 */
export const getChartTypeFromLensConfig = (config: unknown): SupportedChartType | undefined => {
  if (!config || typeof config !== 'object' || !('type' in config)) {
    return undefined;
  }

  const { type } = config;
  return typeof type === 'string' && SUPPORTED_CHART_TYPES.has(type)
    ? (type as SupportedChartType)
    : undefined;
};
