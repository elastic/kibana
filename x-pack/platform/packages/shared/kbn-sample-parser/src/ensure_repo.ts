/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { promises as Fs } from 'fs';
import simpleGit from 'simple-git';

export async function ensureRepo({
  log,
  dir,
  repo,
}: {
  log: ToolingLog;
  dir: string;
  repo: string;
}) {
  const dirExists = await Fs.stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!dirExists) {
    log.info(`Directory "${dir}" does not exist. Cloning repository...`);
    await simpleGit().clone(repo, dir, ['--depth', '1']);
  }

  const repoGit = simpleGit(dir);

  log.debug(`Fetching from ${repo}`);

  await repoGit.fetch();

  const defaultBranch = (await repoGit.revparse(['--abbrev-ref', 'origin/HEAD'])).replace(
    'origin/',
    ''
  );

  const currentBranch = (await repoGit.revparse(['--abbrev-ref', 'HEAD'])) || defaultBranch;

  if (currentBranch !== defaultBranch) {
    log.info(`Checking out ${defaultBranch}`);

    await repoGit.checkout(defaultBranch);
  }

  const status = await repoGit.status();
  if (status.behind && status.behind > 0) {
    log.info(`Local branch is behind by ${status.behind} commit(s); pulling changes.`);
    await repoGit.pull('origin', defaultBranch);
  } else {
    log.debug(`Local branch is up-to-date; no pull needed.`);
  }
}
