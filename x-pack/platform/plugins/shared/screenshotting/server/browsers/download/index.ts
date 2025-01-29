/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ChromiumArchivePaths, PackageInfo } from '@kbn/screenshotting-server';
import del from 'del';
import { access } from 'fs/promises';
import { sha256 } from './checksum';
import { fetch } from './fetch';

type ValidChecksum = string;

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 */
export async function download(
  paths: ChromiumArchivePaths,
  pkg: PackageInfo,
  logger?: Logger
): Promise<ValidChecksum | undefined> {
  const removedFiles = await del(`${paths.archivesPath}/**/*`, {
    force: true,
    onlyFiles: true,
    ignore: paths.getAllArchiveFilenames(),
  });

  removedFiles.forEach((path) => logger?.warn(`Deleting unexpected file ${path}`));

  const invalidChecksums: string[] = [];

  const { archiveFilename, archiveChecksum } = pkg;
  if (!archiveFilename || !archiveChecksum) {
    return;
  }

  const resolvedPath = paths.resolvePath(pkg);
  const foundChecksum = await sha256(resolvedPath).catch(() => 'MISSING');

  let pathExists = null;
  try {
    await access(resolvedPath);
    pathExists = true;
  } catch (e) {
    pathExists = false;
  }
  if (pathExists && foundChecksum === archiveChecksum) {
    logger?.debug(
      `Browser archive for ${pkg.platform}/${pkg.architecture} already found in ${resolvedPath} with matching checksum.`
    );
    return foundChecksum;
  }

  if (!pathExists) {
    logger?.warn(
      `Browser archive for ${pkg.platform}/${pkg.architecture} not found in ${resolvedPath}.`
    );
  }

  if (foundChecksum !== archiveChecksum) {
    logger?.warn(
      `Browser archive checksum for ${pkg.platform}/${pkg.architecture} ` +
        `is ${foundChecksum} but ${archiveChecksum} was expected.`
    );
  }

  const url = paths.getDownloadUrl(pkg);
  let downloadedChecksum: string | undefined;
  try {
    downloadedChecksum = await fetch(url, resolvedPath, logger);
    if (downloadedChecksum !== archiveChecksum) {
      logger?.warn(
        `Invalid archive checksum for ${pkg.platform}/${pkg.architecture}: ` +
          `expected ${archiveChecksum} got ${downloadedChecksum}`
      );
      invalidChecksums.push(`${url} => ${resolvedPath}`);
    }
  } catch (error) {
    throw new Error(`Failed to download ${url}: ${error}`);
  }

  if (invalidChecksums.length) {
    const error = new Error(
      `Error downloading browsers, archive checksums incorrect for:\n    - ${invalidChecksums.join(
        '\n    - '
      )}`
    );
    logger?.error(error);

    throw error;
  }

  return downloadedChecksum;
}
