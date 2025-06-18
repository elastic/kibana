/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { ensureLangfuse } from '../src/langfuse/ensure_langfuse';

run(({ log, addCleanupTask }) => {
  const controller = new AbortController();

  addCleanupTask(() => {
    controller.abort();
  });

  return ensureLangfuse({
    log,
    signal: controller.signal,
  }).catch((error) => {
    throw new Error('Failed to start Langfuse', { cause: error });
  });
});
