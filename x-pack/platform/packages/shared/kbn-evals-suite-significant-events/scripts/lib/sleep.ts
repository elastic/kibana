/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

export async function sleep(ms: number, log: ToolingLog, reason: string): Promise<void> {
  const minutes = Math.round(ms / 60_000);
  log.info(`Waiting ~${minutes}m for ${reason}...`);

  const tick = 30_000;
  let elapsed = 0;
  while (elapsed < ms) {
    const chunk = Math.min(tick, ms - elapsed);
    await new Promise((resolve) => setTimeout(resolve, chunk));
    elapsed += chunk;
    if (elapsed < ms) {
      log.debug(`  ~${Math.round((ms - elapsed) / 60_000)}m remaining`);
    }
  }
}
