/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromiumArchivePaths, PackageInfo } from '@kbn/screenshotting-server';
import { access, readdir } from 'fs/promises';
import mockFs from 'mock-fs';
import path from 'path';
import { download } from '.';
import { sha256 } from './checksum';
import { fetch } from './fetch';

jest.mock('./checksum');
jest.mock('./fetch');

describe('ensureDownloaded', () => {
  let paths: ChromiumArchivePaths;
  let pkg: PackageInfo;

  beforeEach(() => {
    paths = new ChromiumArchivePaths();
    pkg = paths.find('linux', 'x64') as PackageInfo;

    (sha256 as jest.MockedFunction<typeof sha256>).mockImplementation(
      async (packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-sha256'
    );

    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      async (_url, packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-sha256'
    );

    mockFs();
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it('should remove unexpected files', async () => {
    const unexpectedPath1 = `${paths.archivesPath}/unexpected1`;
    const unexpectedPath2 = `${paths.archivesPath}/unexpected2`;

    mockFs({
      [unexpectedPath1]: 'test',
      [unexpectedPath2]: 'test',
    });

    await download(paths, pkg);

    await expect(access(unexpectedPath1)).rejects.toThrow();
    await expect(access(unexpectedPath2)).rejects.toThrow();
  });

  it('should reject when download fails', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('some error'));

    await expect(download(paths, pkg)).rejects.toBeInstanceOf(Error);
  });

  it('should reject when downloaded sha256 hash is different', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue('random-sha256');

    await expect(download(paths, pkg)).rejects.toBeInstanceOf(Error);
  });

  describe('when archives are already present', () => {
    beforeEach(() => {
      mockFs(
        Object.fromEntries(
          paths.packages.map((packageInfo) => [paths.resolvePath(packageInfo), ''])
        )
      );
    });

    it('should not download again', async () => {
      await download(paths, pkg);

      expect(fetch).not.toHaveBeenCalled();
      await expect(readdir(path.resolve(`${paths.archivesPath}/x64`))).resolves.toEqual(
        expect.arrayContaining([
          'chrome-headless-shell-mac-x64.zip',
          'chrome-headless-shell-win64.zip',
          expect.stringMatching(/^chromium-[0-9a-f]{7}-locales-linux_x64\.zip$/),
        ])
      );
      await expect(readdir(path.resolve(`${paths.archivesPath}/arm64`))).resolves.toEqual(
        expect.arrayContaining([
          'chrome-headless-shell-mac-arm64.zip',
          expect.stringMatching(/^chromium-[0-9a-f]{7}-locales-linux_arm64\.zip$/),
        ])
      );
    });

    it('should download again if sha256 hash different', async () => {
      (sha256 as jest.MockedFunction<typeof sha256>).mockResolvedValueOnce('random-sha256');
      await download(paths, pkg);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
