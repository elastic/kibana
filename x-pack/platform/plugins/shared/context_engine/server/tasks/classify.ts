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

  if (data.status === 'Error') {
    tags.push('query_error');
  }

  if (data.query_kind !== 'other' && data.returned.row_count === 0) {
    tags.push('empty_retrieval');
  }

  if (data.query_kind === 'raw_access') {
    tags.push('coverage_gap');
  }

  return tags;
};
