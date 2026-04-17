/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsResponse } from '@kbn/streams-schema';
import { orderBy } from 'lodash';

/**
 * Sort queries for the Discovery "Queries" table.
 */
export function sortForQueriesTable(
  queries: SignificantEventsResponse[]
): SignificantEventsResponse[] {
  return orderBy(
    queries,
    ['rule_backed', (query) => query.severity_score ?? 0, (query) => query.title],
    ['asc', 'desc', 'asc']
  );
}
