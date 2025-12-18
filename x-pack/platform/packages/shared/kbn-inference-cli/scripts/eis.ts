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
  let eisDir: string | undefined;

  addCleanupTask(async () => {
    controller.abort();
    if (eisDir) {
      log.info('Cleaning up eis-gateway directory');
      const fs = await import('fs/promises');
      await fs.rm(eisDir, { recursive: true, force: true }).catch((error) => {
        log.warning(`Failed to clean up ${eisDir}: ${error.message}`);
      });
    }
  });

  return ensureEis({
    log,
    signal: controller.signal,
    onDirCreated: (dir) => {
      eisDir = dir;
    },
  }).catch((error) => {
    throw new Error('Failed to start EIS', { cause: error });
  });
});
