/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationConfig } from './types';

/**
 * True when the natural-language edit needs different ES|QL columns or filters.
 * Schema-only presentation edits (titles, colors, legends, gradient, sparkline)
 * return false so the existing query can be reused.
 */
export const nlQueryNeedsNewEsql = (nlQuery: string): boolean => {
  const query = nlQuery.toLowerCase();
  return [
    /\bsecondary metric\b/,
    /\bbreakdown\b/,
    /\bgroup by\b/,
    /\bfilter\b/,
    /\bexclude\b/,
    /\bwhere\b/,
    /\berror rate\b/,
    /\bper (host|request|service|user)\b/,
    /\b(p95|p99|percentile)\b/,
    /\bunique\b/,
    /\bdistinct\b/,
    /\btop \d+\b/,
    /\bas (a )?(pie|donut|table)\b/,
    /\bchange the (query|index)\b/,
    /\badd (a )?(measure|column|field|breakdown)\b/,
  ].some((pattern) => pattern.test(query));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const queryFromDataSource = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const dataSource = value.data_source;
  if (!isRecord(dataSource) || dataSource.type !== 'esql') {
    return undefined;
  }
  return typeof dataSource.query === 'string' && dataSource.query.length > 0
    ? dataSource.query
    : undefined;
};

/**
 * First ES|QL query on a Lens config (top-level data_source, or the first XY layer).
 */
export const getExistingEsqlQuery = (config: VisualizationConfig | null | undefined): string | undefined => {
  if (!config) {
    return undefined;
  }

  const fromRoot = queryFromDataSource(config);
  if (fromRoot) {
    return fromRoot;
  }

  const { layers } = config as { layers?: unknown };
  if (!Array.isArray(layers)) {
    return undefined;
  }

  for (const layer of layers) {
    const fromLayer = queryFromDataSource(layer);
    if (fromLayer) {
      return fromLayer;
    }
  }

  return undefined;
};
