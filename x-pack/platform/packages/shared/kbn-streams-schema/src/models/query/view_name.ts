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
