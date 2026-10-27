/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationConfig } from './chart_type_registry';

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
export function getExistingEsqlQueries(config: VisualizationConfig | null): string[] {
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
