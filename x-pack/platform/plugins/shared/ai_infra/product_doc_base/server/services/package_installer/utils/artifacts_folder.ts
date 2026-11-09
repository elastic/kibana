/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import type { Logger } from '@kbn/logging';
import { getSafePath } from '@kbn/fs';

export interface ArtifactsFolderUsage {
  files: number;
  bytes: number;
}

// getSafePath only resolves file names below Kibana's data path, so the folder is derived from a file in it
export const resolveArtifactsFolderPath = (artifactsFolder: string): string =>
  Path.dirname(getSafePath(`${artifactsFolder}/artifact.zip`).fullPath);

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';

export const removeArtifactFile = async (fullPath: string, log: Logger): Promise<void> => {
  try {
    await Fs.unlink(fullPath);
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    log.warn(`Failed to delete artifact [${fullPath}]: ${(error as Error).message}`);
  }
};

export const getArtifactsFolderUsage = async (
  folderPath: string
): Promise<ArtifactsFolderUsage> => {
  let entries: string[];
  try {
    entries = await Fs.readdir(folderPath);
  } catch (error) {
    if (isNotFound(error)) {
      return { files: 0, bytes: 0 };
    }
    throw error;
  }
  const usage = { files: 0, bytes: 0 };
  for (const entry of entries) {
    const stats = await Fs.stat(Path.join(folderPath, entry)).catch(() => undefined);
    if (stats?.isFile()) {
      usage.files += 1;
      usage.bytes += stats.size;
    }
  }
  return usage;
};

const toMegabytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1);

export const logArtifactsFolderUsage = async (folderPath: string, log: Logger): Promise<void> => {
  try {
    const { files, bytes } = await getArtifactsFolderUsage(folderPath);
    log.info(
      `Documentation artifacts folder [${folderPath}] holds ${files} file(s), ${toMegabytes(
        bytes
      )} MB`
    );
  } catch (error) {
    log.warn(`Failed to read artifacts folder [${folderPath}]: ${(error as Error).message}`);
  }
};

/**
 * Deletes every file left in the artifacts folder, e.g. from a previous process lifetime or a failed install.
 */
export const purgeArtifactsFolder = async (
  folderPath: string,
  log: Logger
): Promise<ArtifactsFolderUsage> => {
  const usage = await getArtifactsFolderUsage(folderPath);
  if (usage.files === 0) {
    return usage;
  }
  for (const entry of await Fs.readdir(folderPath)) {
    await removeArtifactFile(Path.join(folderPath, entry), log);
  }
  log.info(
    `Removed ${usage.files} leftover documentation artifact file(s) (${toMegabytes(
      usage.bytes
    )} MB) from [${folderPath}]`
  );
  return usage;
};
