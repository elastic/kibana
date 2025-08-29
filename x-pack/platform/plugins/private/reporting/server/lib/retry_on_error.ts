/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { KibanaShuttingDownError } from '@kbn/reporting-common';
import type { SavedReport } from './store';

const MAX_DELAY_SECONDS = 30;

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
  attempt = 0,
}: RetryOpts): Promise<void> => {
  try {
    const result = await operation(report);

    if (attempt > 0) {
      logger.info(
        `Report generation for report[${report._id}] succeeded on attempt ${attempt + 1}.`
      );
    }
    return result;
  } catch (err) {
    // skip retry on certain errors
    if (err instanceof KibanaShuttingDownError) {
      throw err;
    }

    if (attempt < retries) {
      const retryCount = attempt + 1;
      const retryDelaySec: number = Math.min(Math.pow(2, retryCount), MAX_DELAY_SECONDS); // 2s, 4s, 8s, 16s, 30s, 30s, 30s...

      logger.warn(
        `Retrying report generation for report[${
          report._id
        }] after [${retryDelaySec}s] due to error: ${err.toString()} ${
          err.stack
        } - attempt ${retryCount} of ${retries + 1} failed.`
      );

      // delay with some randomness
      await delay(retryDelaySec + 1000 * Math.random());
      return retryOnError({ operation, logger, report, retries, attempt: retryCount });
    }

    if (retries > 0) {
      // no retries left
      logger.error(
        `No retries left for report generation for report[${
          report._id
        }]. No report generated after ${retries + 1} attempts due to error: ${err.toString()} ${
          err.stack
        }`
      );
    }

    throw err;
  }
};
