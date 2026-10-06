/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfigESQL } from '@kbn/lens-embeddable-utils';
import { isRecord } from '../evaluator_utils';

/**
 * Deep-partial of a Config API type. String `type` fields also accept
 * alternatives (`'bar'` or `['bar', 'bar_horizontal']`).
 */
export type GoldPartial<T> = T extends ReadonlyArray<infer U>
  ? ReadonlyArray<GoldPartial<U>>
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
  return extractQueryFromConfig(asRecord(expected).config);
}

export function extractGoldChartType(expected: unknown): string | string[] | undefined {
  return asStringOrStringArray(asRecord(asRecord(expected).config).type);
}

/** Chart form the gold pins down; string arrays list acceptable alternatives. */
export interface GoldChartForm {
  chartType?: string | string[];
  layerTypes?: Array<string | string[]>;
  mark?: string | string[];
  /** Marks of a layered Vega-Lite spec (`spec.layer[].mark`). */
  layerMarks?: Array<string | string[]>;
}

const readMark = (node: Record<string, unknown>): string | string[] | undefined =>
  asStringOrStringArray(node.mark) ?? asStringOrStringArray(asRecord(node.mark).type);

export function extractGoldChartForm(expected: unknown): GoldChartForm | undefined {
  const output = asRecord(expected);
  const config = asRecord(output.config);
  const chartType = extractGoldChartType(expected);
  const layerTypes = (Array.isArray(config.layers) ? config.layers : []).flatMap((layer) => {
    const layerType = asStringOrStringArray(asRecord(layer).type);
    return layerType === undefined ? [] : [layerType];
  });
  const spec = asRecord(config.spec);
  const mark = readMark(spec);
  const layerMarks = (Array.isArray(spec.layer) ? spec.layer : []).flatMap((layer) => {
    const layerMark = readMark(asRecord(layer));
    return layerMark === undefined ? [] : [layerMark];
  });

  if (
    chartType === undefined &&
    layerTypes.length === 0 &&
    mark === undefined &&
    layerMarks.length === 0
  ) {
    return undefined;
  }
  return {
    ...(chartType === undefined ? {} : { chartType }),
    ...(layerTypes.length === 0 ? {} : { layerTypes }),
    ...(mark === undefined ? {} : { mark }),
    ...(layerMarks.length === 0 ? {} : { layerMarks }),
  };
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
