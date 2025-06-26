/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { promises as Fs } from 'fs';
import Path from 'path';
import os from 'os';
import { noop } from 'lodash';
import simpleGit, { ResetMode } from 'simple-git';
import { createDirIfNotExists } from './file_utils';

class GitCheckoutError extends Error {
  constructor(cause: Error) {
    super(`Failed to checkout repository. Make sure you've authenticated to Git`, { cause });
  }
}

export async function sparseCheckout({
  repository,
  files,
}: {
  repository: {
    user: string;
    name: string;
  };
  files: string[];
}): Promise<string> {
  // Create a temporary directory
  const tmpDir = Path.join(os.tmpdir(), 'kibana-inference', repository.name);

  await createDirIfNotExists(tmpDir);

  const git = simpleGit(tmpDir);

  // Initialize an empty repository and add remote
  await git.init();
  await git.raw(['config', 'core.sparseCheckout', 'true']);

  const sparseCheckoutPath = Path.join(tmpDir, '.git', 'info', 'sparse-checkout');
  await Fs.writeFile(sparseCheckoutPath, files.join('\n'), 'utf-8');

  async function pull() {
    await git.fetch('origin', ['--depth', '1']);
    await git.reset(ResetMode.HARD, ['origin/main']).catch(noop);
  }

  const remotes = (await git.getRemotes()).map((remote) => remote.name);

  if (!remotes.includes('origin')) {
    await git.addRemote('origin', `git@github.com:${repository.user}/${repository.name}.git`);
  }

  await pull()
    .catch(async () => {
      await git.remote([
        'set-url',
        'origin',
        `https://github.com/${repository.user}/${repository.name}.git`,
      ]);
      await pull();
    })
    .catch((error) => {
      throw new GitCheckoutError(error);
    });

  return tmpDir;
}
