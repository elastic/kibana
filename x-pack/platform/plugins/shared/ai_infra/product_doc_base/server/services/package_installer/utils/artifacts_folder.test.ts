/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Os from 'os';
import Path from 'path';
import { loggerMock } from '@kbn/logging-mocks';
import {
  getArtifactsFolderUsage,
  logArtifactsFolderUsage,
  purgeArtifactsFolder,
  removeArtifactFile,
} from './artifacts_folder';

describe('artifacts folder utils', () => {
  let folder: string;
  let log: ReturnType<typeof loggerMock.create>;

  beforeEach(async () => {
    folder = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'kb-artifacts-'));
    log = loggerMock.create();
  });

  afterEach(async () => {
    await Fs.rm(folder, { recursive: true, force: true });
  });

  it('reports the number and size of files in the folder', async () => {
    await Fs.writeFile(Path.join(folder, 'a.zip'), Buffer.alloc(10));
    await Fs.writeFile(Path.join(folder, '.precheck-b.zip'), Buffer.alloc(5));

    await expect(getArtifactsFolderUsage(folder)).resolves.toEqual({ files: 2, bytes: 15 });
  });

  it('reports an empty usage for a missing folder', async () => {
    await expect(getArtifactsFolderUsage(Path.join(folder, 'missing'))).resolves.toEqual({
      files: 0,
      bytes: 0,
    });
  });

  it('removes a file and ignores files that are already gone', async () => {
    const file = Path.join(folder, 'a.zip');
    await Fs.writeFile(file, Buffer.alloc(1));

    await removeArtifactFile(file, log);
    await removeArtifactFile(file, log);

    await expect(Fs.access(file)).rejects.toThrow();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('purges every leftover file and logs what was removed', async () => {
    await Fs.writeFile(Path.join(folder, 'a.zip'), Buffer.alloc(10));
    await Fs.writeFile(Path.join(folder, '.precheck-b.zip'), Buffer.alloc(5));

    await expect(purgeArtifactsFolder(folder, log)).resolves.toEqual({ files: 2, bytes: 15 });

    await expect(Fs.readdir(folder)).resolves.toEqual([]);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Removed 2 leftover'));
  });

  it('logs the folder usage', async () => {
    await Fs.writeFile(Path.join(folder, 'a.zip'), Buffer.alloc(1024 * 1024));

    await logArtifactsFolderUsage(folder, log);

    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('holds 1 file(s), 1.0 MB'));
  });
});
