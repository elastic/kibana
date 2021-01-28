/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import shell from 'shelljs';

export const finalDirAndFile = (dest) => (filePath = 'exported.ndjson') => {
  const destDir = join(REPO_ROOT, dest);
  const destFilePath = join(destDir, filePath);
  return [destDir, destFilePath];
};

export const mkDir = (x) => shell.mkdir('-p', x);

export const id = (x) => x;

export const ndjsonToObj = (x) => x.split('\n').map(JSON.parse);
