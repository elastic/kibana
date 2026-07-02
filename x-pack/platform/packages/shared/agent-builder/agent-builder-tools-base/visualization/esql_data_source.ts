/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsqlDataSourceCarrier {
  data_source?: { type?: string; query?: string };
}

/**
 * Returns the objects that carry a `data_source` for this config shape:
 * XY-ESQL configs keep one `data_source` per layer; every other ESQL chart
 * (metric, gauge, tagcloud, ...) carries it on the config itself. Used to
 * read existing queries (edits), to inject the validated query (generation),
 * and to re-pin the existing query after a micro-edit patch.
 */
export const getEsqlDataSourceCarriers = (config: unknown): EsqlDataSourceCarrier[] => {
  if (!config || typeof config !== 'object') return [];
  const { layers } = config as { layers?: unknown };
  return Array.isArray(layers)
    ? (layers as EsqlDataSourceCarrier[])
    : [config as EsqlDataSourceCarrier];
};
