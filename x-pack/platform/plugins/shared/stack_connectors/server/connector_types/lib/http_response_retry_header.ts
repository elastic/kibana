/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Option } from 'fp-ts/Option';
import { fromNullable, map, filter } from 'fp-ts/Option';
import { pipe } from 'fp-ts/pipeable';

export function getRetryAfterIntervalFromHeaders(headers: Record<string, unknown>): Option<number> {
  return pipe(
    fromNullable(headers['retry-after']),
    map((retryAfter) => parseInt(retryAfter as string, 10)),
    filter((retryAfter) => !isNaN(retryAfter))
  );
}
