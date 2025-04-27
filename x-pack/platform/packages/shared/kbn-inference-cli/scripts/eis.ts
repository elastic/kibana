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

  return ensureEis({
    log,
    signal: controller.signal,
  }).catch((error) => {
    throw new Error('Failed to start EIS', { cause: error });
  });
});
