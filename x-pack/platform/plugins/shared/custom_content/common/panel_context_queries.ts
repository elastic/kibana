/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentContextAttachmentData } from './panel_context_attachment';

type PanelContextQueries = Pick<
  CustomContentContextAttachmentData,
  'esql_query' | 'additional_esql_queries'
>;

// The attachment keeps the main query in the field it always had, `esql_query`, and the others in
// `additional_esql_queries`, so conversations saved before a panel could have several still read.
// These two functions are the only place that knows it: everything else works with one list.

/** The queries of a panel context, in the order its template reads them. None without a main query. */
export const readContextQueries = ({
  esql_query: esqlQuery,
  additional_esql_queries: additionalQueries,
}: PanelContextQueries): string[] => (esqlQuery ? [esqlQuery, ...(additionalQueries ?? [])] : []);

/** The fields of a panel context that hold the given queries, the first of which is the main one. */
export const toContextQueries = (esqlQueries: readonly string[]): PanelContextQueries => ({
  esql_query: esqlQueries[0],
  ...(esqlQueries.length > 1 ? { additional_esql_queries: esqlQueries.slice(1) } : {}),
});
