/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleHealthFormattedResult } from '../../../../../application/rule/methods/aggregate/types';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusValues,
  RuleLastRunOutcomeValues,
} from '../../../../../../common';
import type { RuleHealthAggregationResult } from '../types';

const DEFAULT_TOP_MESSAGES = 10;

const bucketsToRecord = (
  buckets: Array<{ key: string; doc_count: number }>,
  knownKeys: readonly string[]
): Record<string, number> => {
  const record: Record<string, number> = {};
  for (const key of knownKeys) {
    record[key] = 0;
  }
  for (const { key, doc_count: docCount } of buckets) {
    record[key] = docCount;
  }
  return record;
};

/** Flattens the raw health aggregation buckets into the API result shape. */
export const formatRuleHealthAggregationResult = (
  aggregations: RuleHealthAggregationResult | undefined,
  { topMessages = DEFAULT_TOP_MESSAGES }: { topMessages?: number } = {}
): RuleHealthFormattedResult => {
  if (!aggregations) {
    return {
      total: 0,
      byOutcome: bucketsToRecord([], RuleLastRunOutcomeValues),
      byStatus: bucketsToRecord([], RuleExecutionStatusValues),
      byErrorReason: [],
      byWarningReason: [],
      topErrorMessages: [],
      apiKeyError: { count: 0, messages: [] },
      missingApiKey: { count: 0 },
    };
  }

  const byStatus = bucketsToRecord(aggregations.status.buckets, RuleExecutionStatusValues);
  const byOutcome = bucketsToRecord(aggregations.outcome.buckets, RuleLastRunOutcomeValues);
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  const byErrorReason = aggregations.error_reason.buckets.map(({ key, doc_count: docCount }) => ({
    reason: key,
    count: docCount,
  }));

  const byWarningReason = aggregations.warning_reason.buckets.map(
    ({ key, doc_count: docCount }) => ({ reason: key, count: docCount })
  );

  // Rules classified `unauthorized` plus legacy `execute` rules whose message reveals an API key
  // rejection, without double counting rules that appear in both.
  const unauthorizedCount =
    aggregations.error_reason.buckets.find(
      ({ key }) => key === RuleExecutionStatusErrorReasons.Unauthorized
    )?.doc_count ?? 0;
  const apiKeyErrorBuckets = aggregations.api_key_error?.buckets ?? [];
  const legacyApiKeyErrorCount = apiKeyErrorBuckets.reduce(
    (sum, { doc_count: docCount, reason }) =>
      sum +
      docCount -
      (reason?.buckets.find(({ key }) => key === RuleExecutionStatusErrorReasons.Unauthorized)
        ?.doc_count ?? 0),
    0
  );

  const topErrorMessages = aggregations.error_reason.buckets
    .flatMap(({ key: reason, message }) =>
      message.buckets.map(({ key: messageText, doc_count: docCount }) => ({
        reason,
        message: messageText,
        count: docCount,
      }))
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, topMessages);

  return {
    total,
    byOutcome,
    byStatus,
    byErrorReason,
    byWarningReason,
    topErrorMessages,
    apiKeyError: {
      count: unauthorizedCount + legacyApiKeyErrorCount,
      messages: apiKeyErrorBuckets.map(({ key }) => key),
    },
    missingApiKey: {
      count:
        (aggregations.missing_api_key?.doc_count ?? 0) +
        (aggregations.legacy_missing_api_key?.doc_count ?? 0),
    },
  };
};
