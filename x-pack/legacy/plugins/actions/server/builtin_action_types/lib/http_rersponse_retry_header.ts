/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable } from 'fp-ts/lib/Option';

const DEFAULT_RETRY_AFTER: number = 60;
export function getRetryAfterIntervalFromHeaders(headers: Record<string, string>): number {
  return fromNullable(headers['retry-after'])
    .map(retryAfter => parseInt(retryAfter, 10))
    .filter(retryAfter => !isNaN(retryAfter))
    .getOrElse(DEFAULT_RETRY_AFTER);
}
