/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Hjson from 'hjson';
import type { ChartSelection, SelectionPredicate } from './selection';

import type { TimeRange } from './dashboard';

export type VegaMode = 'vega' | 'vega-lite';
export type VegaSpec = Record<string, unknown>;
type Path = Array<string | number>;

/** Kibana's Elasticsearch data source: `data.url` as an object rather than a URL. */
export interface KibanaEsUrl {
  index: string;
  body?: Record<string, unknown>;
  '%context%'?: boolean;
  '%timefield%'?: string;
  [key: string]: unknown;
}

export interface VegaSource {
  /** Path from the spec root to the data entry holding `url`. */
  path: Path;
  url: KibanaEsUrl;
  /** The matching data view's runtime fields, which Kibana sends with the search. */
  runtimeMappings?: Record<string, unknown>;
}

export class VegaSourceError extends Error {}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Kibana stores Vega specs as HJSON: comments, unquoted keys and strings. */
export const parseKibanaVegaSpec = (text: string): { mode: VegaMode; spec: VegaSpec } => {
  const spec = Hjson.parse(text, { legacyRoot: false }) as unknown;
  if (!isObject(spec)) {
    throw new Error('Vega spec is not an object');
  }
  const schema = typeof spec.$schema === 'string' ? spec.$schema : '';
  return { mode: schema.includes('vega-lite') ? 'vega-lite' : 'vega', spec };
};

const isEsUrl = (value: unknown): value is KibanaEsUrl =>
  isObject(value) && typeof value.index === 'string';

/** Every Elasticsearch-backed data entry, at any depth: Vega's `data[]`, Vega-Lite's `data`, layers and concats. */
export const vegaSources = (spec: VegaSpec): VegaSource[] => {
  const sources: VegaSource[] = [];
  const visit = (value: unknown, path: Path): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }
    if (!isObject(value)) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'data') {
        const entries: Array<[unknown, Path]> = Array.isArray(child)
          ? child.map((item, index) => [item, [...path, key, index]])
          : [[child, [...path, key]]];
        for (const [entry, entryPath] of entries) {
          if (isObject(entry) && isEsUrl(entry.url)) {
            sources.push({ path: entryPath, url: entry.url });
          }
        }
      }
      visit(child, [...path, key]);
    }
  };
  visit(spec, []);
  return sources;
};

/** Every source that is a URL string or other non-Elasticsearch loader, which the pack refuses. */
export const unsupportedSources = (spec: VegaSpec): string[] => {
  const found: string[] = [];
  const visit = (value: unknown, path: Path): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
    } else if (isObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (key === 'url' && !isEsUrl(child)) {
          found.push([...path, key].join('.'));
        }
        visit(child, [...path, key]);
      }
    }
  };
  visit(spec, []);
  return found;
};

const KNOWN_URL_KEYS = new Set(['index', 'body', '%context%', '%timefield%']);
const PLACEHOLDER = /%[a-z_-]+%/i;

export const predicateToDsl = ({
  field,
  value,
  range,
}: SelectionPredicate): Record<string, unknown>[] => [
  ...(value === undefined ? [] : [{ term: { [field]: value } }]),
  ...(range === undefined ? [] : [{ range: { [field]: { gte: range.gte, lt: range.lt } } }]),
];

export const selectionsToDsl = (selections: readonly ChartSelection[]): Record<string, unknown>[] =>
  selections.flatMap(({ predicates }) => predicates.flatMap(predicateToDsl));

/** The dashboard's query, filters and controls as one bool, as `@kbn/es-query` `buildEsQuery` returns it. */
export interface DashboardBool {
  must?: unknown[];
  filter?: unknown[];
  should?: unknown[];
  must_not?: unknown[];
}

const CONTEXT_CLAUSES = {
  '%dashboard_context-must_clause%': 'must',
  '%dashboard_context-filter_clause%': 'filter',
  '%dashboard_context-must_not_clause%': 'must_not',
} as const;

/**
 * Kibana's in-body placeholders: each `%dashboard_context-*%` array item becomes the dashboard's clauses of that
 * kind, here the selections' filters, and a `range` field's `{ "%timefilter%": true }` becomes the time range.
 * `%timefilter%` with `shift` or `unit`, and `"min"` / `"max"`, are left for the refusal below.
 */
const substituteDashboardContext = (
  value: unknown,
  {
    timeRange,
    filters,
    context,
  }: {
    timeRange?: TimeRange | undefined;
    filters: readonly Record<string, unknown>[];
    context: DashboardBool;
  }
): Record<string, unknown> => {
  const clauses = {
    must: [...(context.must ?? [])],
    filter: [...filters, ...(context.filter ?? [])],
    must_not: [...(context.must_not ?? [])],
  } as Record<string, unknown[]>;
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.flatMap((item) =>
        typeof item === 'string' && item in CONTEXT_CLAUSES
          ? clauses[CONTEXT_CLAUSES[item as keyof typeof CONTEXT_CLAUSES]]!
          : [visit(item)]
      );
    }
    if (!isObject(node)) {
      return node;
    }
    if (node['%timefilter%'] === true && Object.keys(node).length === 1) {
      if (!timeRange) {
        throw new VegaSourceError('%timefilter% needs a time range');
      }
      return { gte: timeRange.from, lte: timeRange.to, format: 'strict_date_optional_time' };
    }
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
  };
  return visit(value) as Record<string, unknown>;
};

/**
 * The `_search` body Kibana would send: `%context%` becomes the dashboard's query and
 * filters, `%timefield%` adds the time range. Other placeholders are refused.
 */
export const kibanaSearchBody = (
  url: KibanaEsUrl,
  {
    timeRange,
    filters = [],
    context = {},
    runtimeMappings,
  }: {
    timeRange?: TimeRange | undefined;
    filters?: readonly Record<string, unknown>[];
    /** The dashboard's context, for `%context%` and the `%dashboard_context-*%` placeholders. */
    context?: DashboardBool;
    runtimeMappings?: Record<string, unknown> | undefined;
  }
): Record<string, unknown> => {
  const unknown = Object.keys(url).filter((key) => !KNOWN_URL_KEYS.has(key));
  if (unknown.length > 0) {
    throw new VegaSourceError(`unsupported Kibana data keys: ${unknown.join(', ')}`);
  }
  const body = substituteDashboardContext(structuredClone(url.body ?? {}), {
    timeRange,
    filters,
    context,
  });
  const placeholder = PLACEHOLDER.exec(JSON.stringify(body));
  if (placeholder) {
    throw new VegaSourceError(`unsupported Kibana placeholder ${placeholder[0]} in the query body`);
  }
  const timefield = url['%timefield%'];
  if (timefield !== undefined && url['%context%'] !== true) {
    throw new VegaSourceError('%timefield% needs %context%: true');
  }
  if (url['%context%'] === true) {
    if (body.query !== undefined) {
      throw new VegaSourceError('%context% and body.query are mutually exclusive');
    }
    const range =
      timefield && timeRange
        ? [
            {
              range: {
                [timefield]: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                  format: 'strict_date_optional_time',
                },
              },
            },
          ]
        : [];
    body.query = {
      bool: {
        must: [...(context.must ?? [])],
        filter: [...range, ...filters, ...(context.filter ?? [])],
        should: [...(context.should ?? [])],
        must_not: [...(context.must_not ?? [])],
      },
    };
  }
  if (runtimeMappings && Object.keys(runtimeMappings).length > 0) {
    body.runtime_mappings = {
      ...runtimeMappings,
      ...(isObject(body.runtime_mappings) ? body.runtime_mappings : {}),
    };
  }
  return body;
};

const at = (root: unknown, path: Path): Record<string, unknown> =>
  path.reduce<unknown>(
    (cursor, segment) => (cursor as Record<string | number, unknown>)[segment],
    root
  ) as Record<string, unknown>;

/** A copy of `spec` with each source's `url` replaced by its response under `values`; `format.property` still applies. */
export const inlineVegaData = (
  spec: VegaSpec,
  resolved: ReadonlyArray<{ path: Path; values: unknown }>
): VegaSpec => {
  const copy = structuredClone(spec);
  for (const { path, values } of resolved) {
    const entry = at(copy, path);
    delete entry.url;
    entry.values = values;
  }
  return copy;
};

/** Kibana's own expression functions, which act on the dashboard and mean nothing outside it. */
const KIBANA_FUNCTIONS = /\bkibana(AddFilter|RemoveFilter|RemoveAllFilters|SetTimeFilter)\s*\(/;

/** Why a Kibana Vega spec cannot be drawn faithfully from inline data, or `undefined`. */
export const vegaRefusal = (spec: VegaSpec): string | undefined => {
  const called = KIBANA_FUNCTIONS.exec(JSON.stringify(spec));
  if (called) {
    return `calls Kibana's ${called[0].replace(/\s*\($/, '')}, which acts on the dashboard`;
  }
  const urls = unsupportedSources(spec);
  if (urls.length > 0) {
    return `loads data by URL (${urls.join(', ')})`;
  }
  return undefined;
};

/**
 * A copy of `spec` without its Kibana settings (`config.kibana`, or the deprecated `_hostConfig`), which steer
 * Kibana's own container, as `VegaParser._parseConfig` removes them.
 */
export const withoutKibanaConfig = (spec: VegaSpec): VegaSpec => {
  const { _hostConfig: _host, ...rest } = spec;
  if (!isObject(rest.config) || !('kibana' in rest.config)) {
    return rest;
  }
  const { kibana: _kibana, ...config } = rest.config;
  return { ...rest, config };
};
