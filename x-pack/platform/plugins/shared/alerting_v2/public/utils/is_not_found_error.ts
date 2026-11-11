/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

export const isNotFoundError = (error: unknown): boolean =>
  (error as IHttpFetchError | undefined)?.response?.status === 404;

const MAX_RETRIES = 3;

/**
 * React Query `retry` predicate that skips 404s (the entity is gone, retrying only delays
 * the not-found UI) and keeps the default retry count for other errors (network, 5xx).
 */
export const retryUnlessNotFound = (failureCount: number, error: unknown): boolean =>
  !isNotFoundError(error) && failureCount < MAX_RETRIES;
