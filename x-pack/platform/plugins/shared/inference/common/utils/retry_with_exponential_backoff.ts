/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { retry, timer } from 'rxjs';

/**
 * Returns an operator that retries the source observable with exponential backoff,
 * but only for errors that match the provided filter.
 *
 * @param maxRetry - Maximum number of retry attempts. Defaults to 3.
 * @param initialDelay - The delay in milliseconds before the first retry. Defaults to 1000.
 * @param backoffMultiplier - Factor by which the delay increases each time. Defaults to 2.
 * @param errorFilter - Function to decide whether an error is eligible for a retry. Defaults to retrying any error.
 */
export function retryWithExponentialBackoff<T>({
  maxRetry = 3,
  initialDelay = 1000,
  backoffMultiplier = 2,
  errorFilter = () => true,
}: {
  maxRetry?: number;
  initialDelay?: number;
  backoffMultiplier?: number;
  errorFilter?: (error: Error) => boolean;
}) {
  return retry<T>({
    count: maxRetry,
    delay: (error, retryCount) => {
      // If error doesn't match the filter, abort retrying by throwing the error.
      if (!errorFilter(error)) {
        throw error;
      }
      const delayTime = initialDelay * Math.pow(backoffMultiplier, retryCount - 1);
      return timer(delayTime);
    },
  });
}
