/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolingLog } from '@kbn/tooling-log';
import { promises as Fs } from 'fs';
import simpleGit from 'simple-git';
import { LOGHUB_DIR, LOGHUB_REPO } from './constants';

export async function ensureLoghubRepo({ log }: { log: ToolingLog }) {
  const dirExists = await Fs.stat(LOGHUB_DIR)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!dirExists) {
    log.info(`Directory "${LOGHUB_DIR}" does not exist. Cloning repository...`);
    await simpleGit().clone(LOGHUB_REPO, LOGHUB_DIR, ['--depth', '1']);
  }

  const repoGit = simpleGit(LOGHUB_DIR);

  log.debug(`Fetching from logai/loghub`);

  await repoGit.fetch();

  const defaultBranch =
    (await repoGit.revparse(['--abbrev-ref', 'origin/HEAD'])).replace('origin/', '') || 'master';

  log.debug(`Checking out ${defaultBranch}`);

  await repoGit.checkout(defaultBranch);

  log.debug(`Pulling ${defaultBranch} from logai/loghub`);

  await repoGit.pull('origin', defaultBranch);
}
