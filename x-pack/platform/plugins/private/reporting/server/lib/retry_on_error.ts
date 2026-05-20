/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { KibanaShuttingDownError } from '@kbn/reporting-common';
import pRetry from 'p-retry';
import type { SavedReport } from './store';

export const MAX_DELAY_SECONDS = 30;

interface RetryOpts {
  attempt?: number;
  logger: Logger;
  operation: (rep: SavedReport) => Promise<void>;
  report: SavedReport;
  retries: number;
}

export const retryOnError = async ({
  operation,
  retries,
  report,
  logger,
}: RetryOpts): Promise<void> => {
  let attempt = 0;

  try {
    return await pRetry(
      async () => {
        const result = await operation(report);

        if (attempt > 0) {
          logger.info(
            `Report generation for report[${report._id}] succeeded on attempt ${attempt + 1}.`,
            { tags: [report._id] }
          );
        }

        return result;
      },
      {
        retries,
        factor: 2,
        minTimeout: 2000,
        maxTimeout: MAX_DELAY_SECONDS * 1000,
        randomize: true,
        onFailedAttempt: (err) => {
          if (err instanceof KibanaShuttingDownError) {
            throw err;
          }

          attempt = err.attemptNumber;

          if (err.retriesLeft > 0) {
            const retryDelaySec: number = Math.min(Math.pow(2, err.attemptNumber), MAX_DELAY_SECONDS);

            logger.error(
              `Retrying report generation for report[${
                report._id
              }] after [${retryDelaySec}s] due to error: ${err.toString()} - attempt ${
                err.attemptNumber
              } of ${retries + 1} failed.`,
              { tags: [report._id], error: { stack_trace: err.stack } }
            );
          }
        },
      }
    );
  } catch (err) {
    if (err instanceof KibanaShuttingDownError) {
      throw err;
    }

    if (retries > 0) {
      // no retries left
      logger.info(
        `No retries left for report generation for report[${
          report._id
        }]. No report generated after ${retries + 1} attempts due to error: ${err.toString()}`,
        { tags: [report._id] }
      );
    }

    throw err;
  }
};
