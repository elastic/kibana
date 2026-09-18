/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolCallSignal } from '../../common/http_api/signals';

/** Returns the classification tags for a signal. */
export const classify = (signal: EsqlToolCallSignal): string[] => {
  const { data } = signal;

  if (data.agent.class === 'management') {
    return [];
  }

  const tags: string[] = [];

  // Outcome tags are mutually exclusive: a query either failed, or ran and returned
  // nothing, or returned rows. A failed query reports 0 rows *because* it errored, so
  // tagging it `empty_retrieval` too would conflate "the query failed" with "the query
  // ran fine but found nothing" — two different problems that must land in different
  // groups. `empty_retrieval` therefore only applies when the query actually ran.
  if (data.status === 'Error') {
    tags.push('query_error');
  } else if (data.query_kind !== 'other' && data.returned.row_count === 0) {
    tags.push('empty_retrieval');
  }

  // Orthogonal "how" axis: the agent used raw data rather than a knowledge indicator.
  if (data.query_kind === 'raw_access') {
    tags.push('coverage_gap');
  }

  return tags;
};
