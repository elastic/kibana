/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDefaultAggregationResult } from '.';

describe('formatDefaultAggregationResult', () => {
  it('should format aggregation result', () => {
    const result = formatDefaultAggregationResult({
      status: {
        buckets: [
          { key: 'active', doc_count: 8 },
          { key: 'error', doc_count: 6 },
          { key: 'ok', doc_count: 10 },
          { key: 'pending', doc_count: 4 },
          { key: 'unknown', doc_count: 2 },
          { key: 'warning', doc_count: 1 },
        ],
      },
      outcome: {
        buckets: [
          { key: 'succeeded', doc_count: 2 },
          { key: 'failed', doc_count: 4 },
          { key: 'warning', doc_count: 6 },
        ],
      },
      enabled: {
        buckets: [
          { key: 0, key_as_string: '0', doc_count: 2 },
          { key: 1, key_as_string: '1', doc_count: 28 },
        ],
      },
      muted: {
        buckets: [
          { key: 0, key_as_string: '0', doc_count: 27 },
          { key: 1, key_as_string: '1', doc_count: 3 },
        ],
      },
      snoozed: {
        count: {
          doc_count: 5,
        },
      },
      tags: {
        buckets: [
          {
            key: 'a',
            doc_count: 10,
          },
          {
            key: 'b',
            doc_count: 20,
          },
          {
            key: 'c',
            doc_count: 30,
          },
        ],
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ruleExecutionStatus: {
          active: 8,
          error: 6,
          ok: 10,
          pending: 4,
          unknown: 2,
          warning: 1,
        },
        ruleLastRunOutcome: {
          succeeded: 2,
          failed: 4,
          warning: 6,
        },
        ruleEnabledStatus: {
          enabled: 28,
          disabled: 2,
        },
        ruleMutedStatus: {
          muted: 3,
          unmuted: 27,
        },
        ruleSnoozedStatus: {
          snoozed: 5,
        },
        ruleTags: ['a', 'b', 'c'],
      })
    );
  });
});
