/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RetryReporter } from './types';

const getStatusCode = (error: Error): number | undefined =>
  'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : undefined;

/**
 * A reporter that writes attempts as debug lines and retries as warnings to a core
 * `Logger`, prefixed with `[<serviceName>][retryWithBackoff]`.
 */
export const createLoggerRetryReporter = (logger: Logger, serviceName: string): RetryReporter => {
  const prefix = `[${serviceName}][retryWithBackoff]`;

  return {
    onAttempt: (attempt) => {
      logger.debug(`${prefix} Running. Attempt: ${attempt}`, { labels: { attempt } });
    },
    onRetry: (error, attempt) => {
      const statusCode = getStatusCode(error);

      if (statusCode !== undefined) {
        logger.warn(
          `${prefix} Failed with status code ${statusCode}. Attempt for retry: ${attempt}`
        );
        return;
      }

      logger.warn(`${prefix} Failed with error "${error.message}". Attempt for retry: ${attempt}`);
    },
    onSettled: (attempt) => {
      logger.debug(`${prefix} Run ended after ${attempt} attempts.`, { labels: { attempt } });
    },
  };
};
