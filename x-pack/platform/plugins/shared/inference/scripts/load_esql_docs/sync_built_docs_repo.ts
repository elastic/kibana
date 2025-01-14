/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import git, { SimpleGitProgressEvent } from 'simple-git';
import { SingleBar } from 'cli-progress';
import { once } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';

export const syncBuiltDocs = async ({
  builtDocsDir,
  log,
}: {
  builtDocsDir: string;
  log: ToolingLog;
}) => {
  const dirExists = await exists(builtDocsDir);

  if (!dirExists) {
    log.info('Cloning built-docs repo. This will take a while.');

    const { progress, stop } = getProgressHandler();
    await git(Path.join(builtDocsDir, '..'), {
      progress,
    }).clone(`https://github.com/elastic/built-docs`, builtDocsDir, ['--depth', '1']);

    stop();
  }

  const { progress, stop } = getProgressHandler();

  const builtDocsGit = git(builtDocsDir, { progress });

  log.debug('Initializing simple-git');
  await builtDocsGit.init();

  log.info('Making sure built-docs is up to date');
  await builtDocsGit.pull();

  stop();
};

const exists = async (path: string): Promise<boolean> => {
  let dirExists = true;
  try {
    await Fs.stat(path);
  } catch (e) {
    if (e.code === 'ENOENT') {
      dirExists = false;
    } else {
      throw e;
    }
  }
  return dirExists;
};

const getProgressHandler = () => {
  let stage: string = '';
  let method: string = '';
  const loader: SingleBar = new SingleBar({
    barsize: 25,
    format: `{phase} {bar} {percentage}%`,
  });

  const start = once(() => {
    loader.start(100, 0, { phase: 'initializing' });
  });

  return {
    progress: (event: SimpleGitProgressEvent) => {
      start();
      if (event.stage !== stage || event.method !== method) {
        stage = event.stage;
        method = event.method;
      }
      loader.update(event.progress, { phase: event.method + '/' + event.stage });
    },
    stop: () => loader.stop(),
  };
};
