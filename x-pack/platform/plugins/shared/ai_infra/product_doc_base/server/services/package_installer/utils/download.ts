/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { access } from 'fs/promises';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { createWriteStream, getSafePath } from '@kbn/fs';
import { pipeline } from 'stream/promises';
import { resolveLocalArtifactsPath } from './local_artifacts';
import { getFetchOptions } from '../../proxy';

export class ArtifactNotFoundError extends Error {
  constructor(fileUrl: string) {
    super(`Artifact not found at [${fileUrl}]`);
    this.name = 'ArtifactNotFoundError';
  }
}

/**
 * Verifies that an artifact exists without downloading it: a HEAD request for remote repositories,
 * a file existence check for local ones.
 */
export const checkArtifactAvailable = async (
  fileUrl: string,
  artifactRepositoryProxyUrl?: string
): Promise<void> => {
  const parsedUrl = new URL(fileUrl);
  if (parsedUrl.protocol === 'file:') {
    try {
      await access(resolveLocalArtifactsPath(parsedUrl));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ArtifactNotFoundError(fileUrl);
      }
      throw error;
    }
    return;
  }
  const fetchOptions = getFetchOptions(fileUrl, artifactRepositoryProxyUrl);
  const res = await fetch(fileUrl, { ...fetchOptions, method: 'HEAD' } as RequestInit);
  assertArtifactResponse(res, fileUrl);
};

const assertArtifactResponse = (res: Response, fileUrl: string): void => {
  if (res.status === 404) {
    throw new ArtifactNotFoundError(fileUrl);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch artifact [${fileUrl}]: ${res.status} ${res.statusText}`);
  }
};

/**
 * Makes an artifact available on disk and returns its path: a remote artifact is downloaded to
 * `filePathAtVolume` in the artifacts folder, an artifact of a local (`file://`) repository is read in
 * place, so e.g. the serverless bundle is never copied into the memory-backed data directory.
 */
export const downloadToDisk = async (
  fileUrl: string,
  filePathAtVolume: string,
  artifactRepositoryProxyUrl?: string
): Promise<string> => {
  const parsedUrl = new URL(fileUrl);
  if (parsedUrl.protocol === 'file:') {
    return resolveLocalArtifactsPath(parsedUrl);
  }

  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);
  const fetchOptions = getFetchOptions(fileUrl, artifactRepositoryProxyUrl);
  const res = await fetch(fileUrl, fetchOptions as RequestInit);
  assertArtifactResponse(res, fileUrl);

  if (!res.body) {
    throw new Error('Response body is null');
  }
  const readStream = Readable.fromWeb(res.body as WebReadableStream);
  const writeStream = createWriteStream(filePathAtVolume);
  await pipeline(readStream, writeStream);

  return artifactFullPath;
};
