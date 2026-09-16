/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfigESQL } from '@kbn/lens-embeddable-utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-partial of a Config API type. String `type` fields also accept
 * alternatives (`'bar'` or `['bar', 'bar_horizontal']`).
 */
export type GoldPartial<T> = T extends ReadonlyArray<infer U>
  ? Array<GoldPartial<U>>
  : T extends object
  ? {
      [K in keyof T]?: K extends 'type' ? GoldTypeAlternatives<T[K]> : GoldPartial<T[K]>;
    }
  : T;

type GoldTypeAlternatives<T> = [T] extends [string] ? T | readonly T[] : GoldPartial<T>;

/** Partial Lens ES|QL Config API, or a Vega-Lite spec object (not `VegaConfig.spec`'s string). */
export type VisualizationGoldConfig =
  | GoldPartial<LensApiConfigESQL>
  | GoldPartial<{
      data_source: { type: 'esql'; query: string };
      spec: Record<string, unknown>;
    }>;

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

export function extractGoldQuery(expected: unknown): string {
  const output = asRecord(expected);
  const fromConfig = extractQueryFromConfig(output.config);
  if (fromConfig) {
    return fromConfig;
  }
  return typeof output.query === 'string' ? output.query : '';
}

export function extractGoldChartType(expected: unknown): string | string[] | undefined {
  const output = asRecord(expected);
  return (
    asStringOrStringArray(isRecord(output.config) ? output.config.type : undefined) ??
    asStringOrStringArray(output.chartType)
  );
}

export function extractGoldRenderer(expected: unknown): 'lens' | 'vega' | undefined {
  const output = asRecord(expected);
  if (output.renderer === 'lens' || output.renderer === 'vega') {
    return output.renderer;
  }
  if (isRecord(output.config) && isRecord(output.config.spec)) {
    return 'vega';
  }
  return undefined;
}

/** True when gold declares chart structure; `{ data_source }` alone is query-only. */
export function hasStructuralGoldConfig(config: VisualizationGoldConfig | undefined): boolean {
  return config != null && Object.keys(config).some((key) => key !== 'data_source');
}

function extractQueryFromConfig(config: unknown): string {
  if (!isRecord(config)) {
    return '';
  }
  const direct = readDataSourceQuery(config.data_source);
  if (direct) {
    return direct;
  }
  if (!Array.isArray(config.layers)) {
    return '';
  }
  for (const layer of config.layers) {
    const nested = extractQueryFromConfig(layer);
    if (nested) {
      return nested;
    }
  }
  return '';
}

function readDataSourceQuery(dataSource: unknown): string {
  if (!isRecord(dataSource) || typeof dataSource.query !== 'string') {
    return '';
  }
  return dataSource.query;
}

function asStringOrStringArray(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.every((item): item is string => typeof item === 'string')) {
    return value;
  }
  return undefined;
}
