/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  API_KEY_AUTH_ERROR_MESSAGE_REGEX,
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '../../../../../../../common/constants';
import type { RuleHealthAggregationParams } from '../../types';

export const DEFAULT_MAX_REASONS = 20;
export const DEFAULT_MAX_MESSAGES_PER_REASON = 5;
const MAX_API_KEY_ERROR_MESSAGES = 100;

/**
 * Buckets rules by last-run outcome, execution status, error/warning reason and
 * error message, counts rules whose last run failed because their API key was rejected,
 * and counts rules tagged as missing their Elastic Cloud API key.
 */
export const ruleHealthAggregationFactory = (
  params?: RuleHealthAggregationParams
): Record<string, AggregationsAggregationContainer> => {
  const {
    maxReasons = DEFAULT_MAX_REASONS,
    maxMessagesPerReason = DEFAULT_MAX_MESSAGES_PER_REASON,
  } = params || {};
  return {
    status: {
      terms: { field: 'alert.attributes.executionStatus.status' },
    },
    outcome: {
      terms: { field: 'alert.attributes.lastRun.outcome' },
    },
    error_reason: {
      terms: { field: 'alert.attributes.executionStatus.error.reason', size: maxReasons },
      aggs: {
        message: {
          terms: {
            field: 'alert.attributes.executionStatus.error.message',
            size: maxMessagesPerReason,
          },
        },
      },
    },
    warning_reason: {
      terms: { field: 'alert.attributes.executionStatus.warning.reason', size: maxReasons },
    },
    // Rules whose last run was classified `unauthorized` are already in `error_reason`; this catches
    // rules that last ran on an older Kibana and still carry the failure as a generic `execute` error.
    api_key_error: {
      terms: {
        field: 'alert.attributes.executionStatus.error.message',
        include: API_KEY_AUTH_ERROR_MESSAGE_REGEX,
        size: MAX_API_KEY_ERROR_MESSAGES,
      },
      aggs: {
        reason: {
          terms: { field: 'alert.attributes.executionStatus.error.reason' },
        },
      },
    },
    missing_api_key: {
      filter: { term: { 'alert.attributes.tags': MISSING_UIAM_API_KEY_TAG } },
    },
    legacy_missing_api_key: {
      filter: { term: { 'alert.attributes.tags': LEGACY_MISSING_UIAM_API_KEY_TAG } },
    },
  };
};
