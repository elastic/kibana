/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix used for ES|QL view names to avoid shadowing existing streams/indices.
 * For example, a query stream named "cars.electric" will have an ES|QL view named "$.cars.electric".
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
  if (directChildrenNames.length === 0) {
    return `FROM ${streamName}`;
  }
  const childViews = directChildrenNames.map(getEsqlViewName).join(', ');
  return `FROM ${streamName}, ${childViews}`;
}
