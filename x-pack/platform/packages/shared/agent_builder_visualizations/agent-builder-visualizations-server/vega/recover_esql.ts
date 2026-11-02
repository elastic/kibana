/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Read the ES|QL query from a Kibana Vega-Lite `data.url` object, if it is one. */
const esqlQueryFromUrl = (url: unknown): string | undefined => {
  if (!url || typeof url !== 'object') {
    return undefined;
  }
  const { '%type%': type, query } = url as Record<string, unknown>;
  if (type === 'esql' && typeof query === 'string' && query.trim()) {
    return query;
  }
  return undefined;
};

/**
 * Recover the ES|QL query embedded in a Vega-Lite spec's data source so that
 * edits can reuse the original query instead of regenerating one.
 * `normalizeVegaSpec` binds the query as a `%type%: 'esql'` `data.url`, so the
 * stored spec is the source of truth across save/import round-trips.
 *
 * Accepts a serialized spec or a parsed object; returns undefined when no ES|QL
 * data binding is present or the input cannot be parsed.
 */
export const extractEsqlFromSpec = (
  spec: string | Record<string, unknown> | null | undefined
): string | undefined => {
  if (!spec) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
  } catch {
    return undefined;
  }

  return esqlQueryFromUrl((parsed as { data?: { url?: unknown } } | null)?.data?.url);
};
