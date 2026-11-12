/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRuleHealthAggregationResult } from './format_rule_health_aggregation_result';
import type { RuleHealthAggregationResult } from '../types';

const aggregations: RuleHealthAggregationResult = {
  status: {
    buckets: [
      { key: 'ok', doc_count: 10 },
      { key: 'active', doc_count: 5 },
      { key: 'error', doc_count: 4 },
      { key: 'warning', doc_count: 2 },
      { key: 'pending', doc_count: 1 },
    ],
  },
  outcome: {
    buckets: [
      { key: 'succeeded', doc_count: 15 },
      { key: 'failed', doc_count: 4 },
      { key: 'warning', doc_count: 2 },
    ],
  },
  error_reason: {
    buckets: [
      {
        key: 'execute',
        doc_count: 3,
        message: {
          buckets: [
            { key: 'No such field', doc_count: 2 },
            { key: 'Parse error', doc_count: 1 },
          ],
        },
      },
      {
        key: 'decrypt',
        doc_count: 1,
        message: { buckets: [{ key: 'Unable to decrypt', doc_count: 1 }] },
      },
    ],
  },
  warning_reason: { buckets: [{ key: 'maxAlerts', doc_count: 2 }] },
  api_key_error: {
    buckets: [
      {
        key: 'security_exception: failed to authenticate cloud API key: [0x28D520]',
        doc_count: 2,
        reason: { buckets: [{ key: 'execute', doc_count: 2 }] },
      },
      {
        key: 'security_exception: failed to authenticate cloud API key: [0xD38358]',
        doc_count: 1,
        reason: { buckets: [{ key: 'execute', doc_count: 1 }] },
      },
    ],
  },
  missing_api_key: { doc_count: 3 },
  legacy_missing_api_key: { doc_count: 1 },
};

describe('formatRuleHealthAggregationResult', () => {
  it('returns zeroed placeholders when there are no aggregations', () => {
    expect(formatRuleHealthAggregationResult(undefined)).toEqual({
      total: 0,
      byOutcome: { succeeded: 0, failed: 0, warning: 0 },
      byStatus: { ok: 0, active: 0, error: 0, pending: 0, unknown: 0, warning: 0 },
      byErrorReason: [],
      byWarningReason: [],
      topErrorMessages: [],
      apiKeyError: { count: 0, messages: [] },
      missingApiKey: { count: 0 },
    });
  });

  it('flattens the buckets and fills missing known keys with zeroes', () => {
    const result = formatRuleHealthAggregationResult(aggregations);

    expect(result.total).toBe(22);
    expect(result.byStatus).toEqual({
      ok: 10,
      active: 5,
      error: 4,
      warning: 2,
      pending: 1,
      unknown: 0,
    });
    expect(result.byOutcome).toEqual({ succeeded: 15, failed: 4, warning: 2 });
    expect(result.byErrorReason).toEqual([
      { reason: 'execute', count: 3 },
      { reason: 'decrypt', count: 1 },
    ]);
    expect(result.byWarningReason).toEqual([{ reason: 'maxAlerts', count: 2 }]);
    expect(result.missingApiKey).toEqual({ count: 4 });
    expect(result.apiKeyError).toEqual({
      count: 3,
      messages: [
        'security_exception: failed to authenticate cloud API key: [0x28D520]',
        'security_exception: failed to authenticate cloud API key: [0xD38358]',
      ],
    });
  });

  it('counts unauthorized rules once even when their message also matches', () => {
    const result = formatRuleHealthAggregationResult({
      ...aggregations,
      error_reason: {
        buckets: [
          ...aggregations.error_reason.buckets,
          { key: 'unauthorized', doc_count: 3, message: { buckets: [] } },
        ],
      },
      api_key_error: {
        buckets: [
          {
            key: 'security_exception: unable to authenticate with provided credentials',
            doc_count: 4,
            // 3 of these were classified by the new runner, 1 is a legacy `execute` rule.
            reason: {
              buckets: [
                { key: 'unauthorized', doc_count: 3 },
                { key: 'execute', doc_count: 1 },
              ],
            },
          },
        ],
      },
    });

    expect(result.apiKeyError.count).toBe(4);
  });

  it('tolerates a missing api_key_error aggregation', () => {
    const { api_key_error: _omitted, ...withoutApiKeyError } = aggregations;
    expect(formatRuleHealthAggregationResult(withoutApiKeyError).apiKeyError).toEqual({
      count: 0,
      messages: [],
    });
  });

  it('ranks error messages across reasons by count and caps them', () => {
    const result = formatRuleHealthAggregationResult(aggregations, { topMessages: 2 });

    expect(result.topErrorMessages).toEqual([
      { reason: 'execute', message: 'No such field', count: 2 },
      { reason: 'execute', message: 'Parse error', count: 1 },
    ]);
  });
});
