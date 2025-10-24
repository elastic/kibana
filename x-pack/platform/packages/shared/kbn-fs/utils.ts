/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { validateNoPathTraversal } from './validations';

const DATA_PATH = join(REPO_ROOT, 'data');
const DATA_PATH_RESOLVED = resolve(DATA_PATH);

export function sanitizeFileName(name: string): string {
  validateNoPathTraversal(name);

  const sanitized = name.replace(/[/\:*?"<>|']/g, '');

  return sanitized;
}

export function validateVolume(volume: string): void {
  // Volume must only contain forward slashes for path separators and underscores
  const validVolumeRegex = /^[a-zA-Z0-9_\/]+$/;

  if (!validVolumeRegex.test(volume)) {
    throw new Error(
      `Invalid volume name: ${volume}. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.`
    );
  }
}

export function getSafePath(name: string, volume?: string): { fullPath: string; alias: string } {
  const sanitizedName = sanitizeFileName(name);

  if (volume) {
    validateVolume(volume);
  }

  const fullPath = volume ? join(DATA_PATH, volume, sanitizedName) : join(DATA_PATH, sanitizedName);

  // Check if the path is within the data path
  const resolvedPath = resolve(fullPath);

  if (!resolvedPath.startsWith(DATA_PATH_RESOLVED)) {
    throw new Error(`Path outside of data path: ${name}`);
  }

  const alias = volume ? `disk:data/${volume}/${sanitizedName}` : `disk:data/${sanitizedName}`;

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
