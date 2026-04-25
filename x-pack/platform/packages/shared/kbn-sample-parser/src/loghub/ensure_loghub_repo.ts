/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { LOGHUB_DIR, LOGHUB_REPO } from './constants';
import { ensureRepo } from '../ensure_repo';

export async function ensureLoghubRepo({ log }: { log: ToolingLog }) {
  await ensureRepo({
    dir: LOGHUB_DIR,
    log,
    repo: LOGHUB_REPO,
  });
}
