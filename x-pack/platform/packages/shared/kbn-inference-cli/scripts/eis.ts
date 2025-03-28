/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { ensureEis } from '../src/eis/ensure_eis';

run(({ log, addCleanupTask }) => {
  const controller = new AbortController();

  addCleanupTask(() => {
    controller.abort();
  });

  function logError(error: Error, indent: number = 0) {
    if (indent === 0) {
      log.error(error);
    } else {
      log.error(error.message);
    }
    if (error instanceof AggregateError) {
      error.errors.forEach((aggregatedError) => {
        logError(aggregatedError, indent + 1);
      });
    }
  }

  return ensureEis({
    log,
    signal: controller.signal,
  }).catch((error) => {
    logError(error);
    throw new AggregateError([error], 'Failed to start EIS');
  });
});
