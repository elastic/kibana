/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_MAX_ESQL_QUERIES_TOTAL_LENGTH } from './constants';

// Kept apart from the zod schemas: the attachment schema is loaded with the plugin, and must not
// pull the schemas of the panel in with it.

/** Whether the queries of a panel are short enough together, since each one can be long. */
export const fitsEsqlQueriesTotalLength = (queries: readonly string[]): boolean =>
  queries.reduce((total, query) => total + query.length, 0) <=
  CUSTOM_CONTENT_MAX_ESQL_QUERIES_TOTAL_LENGTH;

export const ESQL_QUERIES_TOTAL_LENGTH_MESSAGE = `The queries of a panel can have at most ${CUSTOM_CONTENT_MAX_ESQL_QUERIES_TOTAL_LENGTH} characters together.`;
