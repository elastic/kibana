/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';

export const MAX_RESPONSE_SIZE_SETTING = 'xpack.alerting_v2.rules.run.query.maxResponseSize';

/** Which of the rule executor's ES|QL queries tripped the guardrail. */
export type GuardedQueryType = 'breach' | 'recovery' | 'data_presence';

/** Builds the actionable message shown in execution history when a query trips the guard. */
export const buildQueryResponseSizeExceededMessage = (maxResponseSizeBytes?: number): string => {
  const limit =
    maxResponseSizeBytes !== undefined
      ? `${new ByteSizeValue(maxResponseSizeBytes).toString()} (${MAX_RESPONSE_SIZE_SETTING})`
      : `configured by ${MAX_RESPONSE_SIZE_SETTING}`;

  return (
    `ES|QL query response exceeded the maximum allowed size of ${limit}. ` +
    'Narrow the query with KEEP so it returns only the fields the alert needs, ' +
    'drop wide fields, or aggregate with STATS.'
  );
};

/**
 * Raised when an ES|QL response is aborted by the transport for exceeding
 * `rules.run.query.maxResponseSize`. Replaces the raw transport error so the
 * rule owner sees the limit and how to stay under it.
 */
export class QueryResponseSizeExceededError extends Error {
  public readonly queryType: GuardedQueryType;
  public readonly maxResponseSizeBytes?: number;

  constructor(
    queryType: GuardedQueryType,
    maxResponseSizeBytes?: number,
    options?: { cause?: unknown }
  ) {
    super(buildQueryResponseSizeExceededMessage(maxResponseSizeBytes), options);
    this.name = 'QueryResponseSizeExceededError';
    this.queryType = queryType;
    this.maxResponseSizeBytes = maxResponseSizeBytes;
  }
}

export const toQueryResponseSizeExceededError = (
  cause: unknown,
  queryType: GuardedQueryType,
  maxResponseSizeBytes?: number
): QueryResponseSizeExceededError =>
  new QueryResponseSizeExceededError(queryType, maxResponseSizeBytes, { cause });
