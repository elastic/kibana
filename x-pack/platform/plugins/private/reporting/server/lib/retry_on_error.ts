/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { KibanaShuttingDownError } from '@kbn/reporting-common';
import type { SavedReport } from './store';

interface RetryOpts {
  attempt?: number;
  logger: Logger;
  operation: (rep: SavedReport) => Promise<void>;
  report: SavedReport;
  retries: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryOnError = async ({
  operation,
  retries,
  report,
  logger,
  attempt = 1,
}: RetryOpts): Promise<void> => {
  try {
    return await operation(report);
  } catch (err) {
    // skip retry on certain errors
    if (err instanceof KibanaShuttingDownError) {
      throw err;
    }

    if (attempt < retries) {
      const retryCount = attempt + 1;
      const retryDelaySec: number = Math.min(Math.pow(2, retryCount), 30); // 2s, 4s, 8s, 16s, 30s, 30s, 30s...

      logger.warn(
        `Retrying generate report operation after [${retryDelaySec}s] due to error: ${err.toString()} ${
          err.stack
        }`
      );

      // delay with some randomness
      await delay(retryDelaySec * 1000 * Math.random());
      return retryOnError({ operation, logger, report, retries, attempt: retryCount });
    }

    // no retries left
    throw err;
  }
};
