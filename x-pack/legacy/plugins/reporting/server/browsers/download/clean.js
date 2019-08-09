/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readdirSync } from 'fs';
import { resolve as resolvePath } from 'path';

import { fromNode as fcb } from 'bluebird';
import rimraf from 'rimraf';

import { log, asyncMap } from './util';

/**
 * Delete any file in the `dir` that is not in the expectedPaths
 * @param  {String} dir
 * @param  {Array<String>} expectedPaths
 * @return {Promise<undefined>}
 */
export async function clean(dir, expectedPaths) {
  let filenames;
  try {
    filenames = await readdirSync(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // directory doesn't exist, that's as clean as it gets
      return;
    }

    throw error;
  }

  await asyncMap(filenames, async filename => {
    const path = resolvePath(dir, filename);
    if (!expectedPaths.includes(path)) {
      log(`Deleting unexpected file ${path}`);
      await fcb(cb => rimraf(path, cb));
    }
  });
}
