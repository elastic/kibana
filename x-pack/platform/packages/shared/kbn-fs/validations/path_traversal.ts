/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { join, resolve } from 'path';

const DATA_PATH = join(REPO_ROOT, 'data');
const DATA_PATH_RESOLVED = resolve(DATA_PATH);

export function validateNoPathTraversal(fullPath: string): string {
  const resolvedPath = resolve(fullPath);

  if (!resolvedPath.startsWith(DATA_PATH_RESOLVED)) {
    throw new Error(`Path traversal detected: ${fullPath}`);
  }

  return resolvedPath;
}
