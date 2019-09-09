/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromNullable, Option, map, filter } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

export function getRetryAfterIntervalFromHeaders(headers: Record<string, string>): Option<number> {
  return pipe(
    fromNullable(headers['retry-after']),
    map(retryAfter => parseInt(retryAfter, 10)),
    filter(retryAfter => !isNaN(retryAfter))
  );
}
