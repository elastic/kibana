/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CANONICAL_ESQL_SOURCE_NAME } from './dialect';

/** Read the ES|QL query from a Kibana Vega `data.url` object, if it is one. */
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

/** Recover ES|QL from a Vega-Lite top-level `data.url` binding. */
const fromVegaLiteData = (data: unknown): string | undefined =>
  esqlQueryFromUrl((data as { url?: unknown } | null)?.url);

/**
 * Recover ES|QL from a Raw Vega `data` array — prefer the Canonical source
 * named `source`, then any other `%type%: esql` url in the array.
 */
const fromRawVegaData = (data: unknown): string | undefined => {
  if (!Array.isArray(data)) {
    return undefined;
  }
  const entries = data.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry)
  );
  const canonical = entries.find((entry) => entry.name === CANONICAL_ESQL_SOURCE_NAME);
  const fromCanonical = esqlQueryFromUrl(canonical?.url);
  if (fromCanonical) {
    return fromCanonical;
  }
  for (const entry of entries) {
    const query = esqlQueryFromUrl(entry.url);
    if (query) {
      return query;
    }
  }
  return undefined;
};

/**
 * Recover the ES|QL query embedded in a Vega-family spec's data source so that
 * edits can reuse the original query instead of regenerating one.
 * `normalizeVegaSpec` binds the query as a `%type%: 'esql'` url — either on
 * Vega-Lite's top-level `data` or on Raw Vega's Canonical `source` dataset.
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

  const data = (parsed as { data?: unknown } | null)?.data;
  return fromVegaLiteData(data) ?? fromRawVegaData(data);
};
