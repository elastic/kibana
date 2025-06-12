/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { promises as Fs } from 'fs';
import Path from 'path';
import Os from 'os';
import { REPO_ROOT } from '@kbn/repo-info';

export const DATA_DIR = Path.join(REPO_ROOT, 'data', 'eis');

export async function createDirIfNotExists(dir: string): Promise<void> {
  const dirExists = await Fs.stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!dirExists) {
    await Fs.mkdir(dir, { recursive: true });
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  return await Fs.stat(filePath)
    .then((stat) => stat.isFile())
    .catch(() => false);
}

export async function writeTempfile(fileName: string, content: string): Promise<string> {
  const tempDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'eis-'));
  const filePath = Path.join(tempDir, fileName);

  // Write the provided ACL content to the file
  await Fs.writeFile(filePath, content, 'utf8');

  return filePath;
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = Path.dirname(filePath);

  await createDirIfNotExists(dir);

  // Write the provided ACL content to the file
  await Fs.writeFile(filePath, content, 'utf8');
}
