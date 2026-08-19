/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix used for ES|QL view names created by query streams.
 *
 * This prefix serves two purposes:
 * 1. **Avoids shadowing**: Prevents query stream views from colliding with existing
 *    data streams or indices that share the same name.
 * 2. **Isolates query streams from parent views**: Ingest streams query their data using
 *    patterns like `FROM logs.otel, logs.otel.*`. Because query stream views live in the
 *    `$.` namespace (e.g. `$.logs.otel.electric`), they are never matched by these
 *    wildcard patterns. This ensures that aggregated or transformed columns defined by
 *    query streams do not leak into parent stream schemas.
 *
 * To query a query stream directly, use its prefixed view name: `FROM $.cars.electric`.
 *
 * @example
 * // Stream name:  "cars.electric"
 * // ES|QL view:   "$.cars.electric"
 * // Parent query: "FROM cars, cars.*"  → does NOT include $.cars.electric
 * // Direct query: "FROM $.cars.electric"  → returns query stream data
 */
export const ESQL_VIEW_PREFIX = '$.';

/**
 * Generates the ES|QL view name for a given stream name.
 * @param streamName - The name of the stream
 * @returns The ES|QL view name with the prefix applied
 * @example getEsqlViewName('cars.electric') => '$.cars.electric'
 */
export function getEsqlViewName(streamName: string): string {
  return `${ESQL_VIEW_PREFIX}${streamName}`;
}

/**
 * Extracts the stream name from an ES|QL view name.
 * @param viewName - The ES|QL view name
 * @returns The stream name if the view name has the correct prefix, null otherwise
 * @example getStreamNameFromViewName('$.cars.electric') => 'cars.electric'
 * @example getStreamNameFromViewName('other.name') => null
 */
export function getStreamNameFromViewName(viewName: string): string | null {
  if (viewName.startsWith(ESQL_VIEW_PREFIX)) {
    return viewName.slice(ESQL_VIEW_PREFIX.length);
  }
  return null;
}

/**
 * Generates the ES|QL view query for a wired stream.
 * The query targets the stream's own data plus the ES|QL views of its direct children,
 * so that each view in the hierarchy includes data from downstream children transitively.
 * @param streamName - The wired stream name (e.g. 'logs.otel')
 * @param directChildrenNames - Names of the stream's direct children (from routing destinations)
 * @returns The ES|QL FROM query for the view
 * @example getWiredStreamViewQuery('logs.otel', ['logs.otel.child1', 'logs.otel.child2'])
 *   => 'FROM logs.otel, $.logs.otel.child1, $.logs.otel.child2'
 * @example getWiredStreamViewQuery('logs.otel.leaf', [])
 *   => 'FROM logs.otel.leaf'
 */
export function getWiredStreamViewQuery(
  streamName: string,
  directChildrenNames: string[] = []
): string {
  // METADATA _source must be declared inside each view definition so that
  // downstream views (including draft streams) can access the raw document
  // source. Outer METADATA on a view produces null — a known ES|QL
  // tech-preview limitation where view expansion drops outer metadataFields:
  // https://www.elastic.co/docs/reference/query-languages/esql/esql-views#esql-views-limitations
  if (directChildrenNames.length === 0) {
    return `FROM ${streamName} METADATA _source`;
  }
  const childViews = directChildrenNames.map(getEsqlViewName).join(', ');
  return `FROM ${streamName}, ${childViews} METADATA _source`;
}
