/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { validateNoPathTraversal, validateFileExtension } from './validations';

const DATA_PATH = join(REPO_ROOT, 'data');
const DATA_PATH_RESOLVED = resolve(DATA_PATH);

export function getSafePath(name: string, volume?: string): { fullPath: string; alias: string } {
  const fullPath = volume ? join(DATA_PATH, volume, name) : join(DATA_PATH, name);

  const resolvedPath = validateNoPathTraversal(fullPath);

  validateFileExtension(fullPath);

  const alias = volume ? `disk:data/${volume}/${name}` : `disk:data/${name}`;

  return { fullPath: resolvedPath, alias };
}

export async function ensureDirectory(path: string): Promise<void> {
  const dir = dirname(path);

  if (existsSync(dir)) {
    return;
  }

  await fs.mkdir(dir, { recursive: true });
}

export function ensureDirectorySync(path: string): void {
  const dir = dirname(path);

  if (existsSync(dir)) {
    return;
  }

  mkdirSync(dir, { recursive: true });
}
