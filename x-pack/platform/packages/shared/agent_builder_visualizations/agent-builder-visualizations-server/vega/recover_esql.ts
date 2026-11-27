/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlQueriesFromSpec, parseSpec } from '@kbn/vega-utils';

/**
 * Recover the ES|QL query embedded in a Vega-Lite spec's data source so that
 * edits can reuse the original query instead of regenerating one.
 * `normalizeVegaSpec` binds the query as a `%type%: 'esql'` `data.url`, so the
 * stored spec is the source of truth across save/import round-trips.
 *
 * Accepts a serialized spec (JSON or Kibana's HJSON) or a parsed object; returns undefined when no ES|QL
 * data binding is present or the input cannot be parsed. Only a single top-level `data` source is
 * recovered: the Vega author writes one data source, so a query from a `data` array may not be the
 * chart's.
 */
export const extractEsqlFromSpec = (
  spec: string | Record<string, unknown> | null | undefined
): string | undefined => {
  if (!spec) {
    return undefined;
  }

  const parsed = typeof spec === 'string' ? parseSpec({ format: 'hjson', value: spec }) : spec;
  if (!parsed || Array.isArray(parsed.data)) {
    return undefined;
  }
  return getEsqlQueriesFromSpec(parsed).find((query) => query.trim());
};
