/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';

/** Throws one error listing every per-object failure other than `toleratedStatusCode`. */
export const throwOnErrors = (
  action: string,
  results: Array<{ id: string; error?: { statusCode: number; message: string } }>,
  toleratedStatusCode: number
): void => {
  const failures = results.filter(
    ({ error }) => error != null && error.statusCode !== toleratedStatusCode
  );

  if (failures.length > 0) {
    throw Boom.internal(
      `Failed to ${action} ${failures.length} observables: ${failures
        .map(({ id, error }) => `${id}: ${error?.message}`)
        .join('; ')}`
    );
  }
};

/** Runs `operation`, logging the attempt at debug and a failure at error before rethrowing it. */
export const logged = async <T>(
  log: Logger,
  operation: string,
  run: () => Promise<T>
): Promise<T> => {
  try {
    log.debug(`Attempting to ${operation}`);
    return await run();
  } catch (error) {
    log.error(`Failed to ${operation}: ${error}`, { error });
    throw error;
  }
};
