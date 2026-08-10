/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalTag, ToolCallSignal } from '../../common/http_api/signals';

const QUERY_ERROR_CONFIDENCE = 1;
const EMPTY_RETRIEVAL_CONFIDENCE = 1;
const LOOPED_COVERAGE_GAP_CONFIDENCE = 0.9;
const DEFAULT_COVERAGE_GAP_CONFIDENCE = 0.6;

/** Returns the tags for a signal. */
export const classify = (signal: ToolCallSignal): SignalTag[] => {
  const { data } = signal;

  if (data.agent.class === 'management') {
    return [];
  }

  const tags: SignalTag[] = [];

  if (data.status === 'Error') {
    tags.push({ type: 'query_error', confidence: QUERY_ERROR_CONFIDENCE });
  }

  if (data.query_kind !== 'other' && data.returned.row_count === 0) {
    tags.push({ type: 'empty_retrieval', confidence: EMPTY_RETRIEVAL_CONFIDENCE });
  }

  if (data.query_kind === 'raw_access') {
    tags.push({
      type: 'coverage_gap',
      confidence: data.looped ? LOOPED_COVERAGE_GAP_CONFIDENCE : DEFAULT_COVERAGE_GAP_CONFIDENCE,
    });
  }

  return tags;
};
