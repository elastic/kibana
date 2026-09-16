/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfigESQL, XYConfigESQL } from '@kbn/lens-embeddable-utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-partial of a Config API type. String `type` fields also accept
 * alternatives (`'bar'` or `['bar', 'bar_horizontal']`).
 */
export type GoldPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyArray<infer U>
  ? Array<GoldPartial<U>>
  : T extends object
  ? {
      [K in keyof T]?: K extends 'type' ? GoldTypeAlternatives<T[K]> : GoldPartial<T[K]>;
    }
  : T;

type GoldTypeAlternatives<T> = [T] extends [string] ? T | readonly T[] : GoldPartial<T>;

type VisualizationGoldLensConfig = GoldPartial<LensApiConfigESQL>;

export type VisualizationGoldVegaConfig = GoldPartial<{
  data_source: { type: 'esql'; query: string };
  spec: {
    mark: string | { type: string };
    encoding: {
      x: { field: string };
      y: { field: string };
      size: { field: string };
      color: { field: string };
      tooltip: { field: string };
    };
  };
}>;

/**
 * Partial Lens ES|QL Config API, or a Vega-Lite skeleton (`spec` is an object,
 * not the string on persisted `VegaConfig`).
 */
export type VisualizationGoldConfig = VisualizationGoldLensConfig | VisualizationGoldVegaConfig;

export type VisualizationGoldLayer = NonNullable<GoldPartial<XYConfigESQL>['layers']>[number];

export interface VisualizationExampleOutput {
  query?: string;
  chartType?: string | string[];
  renderer?: 'lens' | 'vega';
  goldenToolPath?: string[];
  config?: VisualizationGoldConfig;
}

const asExampleOutput = (expected: unknown): VisualizationExampleOutput =>
  isRecord(expected) ? (expected as VisualizationExampleOutput) : {};

export function extractGoldQuery(expected: unknown): string {
  const output = asExampleOutput(expected);
  const fromConfig = extractQueryFromConfig(output.config);
  if (fromConfig) {
    return fromConfig;
  }
  return typeof output.query === 'string' ? output.query : '';
}

export function extractGoldChartType(expected: unknown): string | string[] | undefined {
  const output = asExampleOutput(expected);
  if (output.config && 'type' in output.config && output.config.type !== undefined) {
    return asTypeAlternatives(output.config.type);
  }
  return output.chartType;
}

export function extractGoldRenderer(expected: unknown): 'lens' | 'vega' | undefined {
  const output = asExampleOutput(expected);
  if (output.renderer === 'lens' || output.renderer === 'vega') {
    return output.renderer;
  }
  if (output.config && 'spec' in output.config && isRecord(output.config.spec)) {
    return 'vega';
  }
  return undefined;
}

/** True when gold declares chart structure; `{ data_source }` alone is query-only. */
export function hasStructuralGoldConfig(config: VisualizationGoldConfig | undefined): boolean {
  return config != null && Object.keys(config).some((key) => key !== 'data_source');
}

function extractQueryFromConfig(config: VisualizationGoldConfig | undefined): string {
  if (!config) {
    return '';
  }
  if ('data_source' in config) {
    const topLevel = readDataSourceQuery(config.data_source);
    if (topLevel) {
      return topLevel;
    }
  }
  if (!('layers' in config) || !Array.isArray(config.layers)) {
    return '';
  }
  for (const layer of config.layers) {
    if (!('data_source' in layer)) {
      continue;
    }
    const query = readDataSourceQuery(layer.data_source);
    if (query) {
      return query;
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

function asTypeAlternatives(type: unknown): string | string[] | undefined {
  if (typeof type === 'string') {
    return type;
  }
  if (Array.isArray(type) && type.every((value): value is string => typeof value === 'string')) {
    return type;
  }
  return undefined;
}
