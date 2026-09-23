/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReadStream, createReadStream } from 'fs';
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

export const downloadToDisk = async (
  fileUrl: string,
  filePathAtVolume: string,
  artifactRepositoryProxyUrl?: string
): Promise<string> => {
  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);
  let readStream: ReadStream;

  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol === 'file:') {
    const path = resolveLocalArtifactsPath(parsedUrl);
    readStream = createReadStream(path);
  } else {
    const fetchOptions = getFetchOptions(fileUrl, artifactRepositoryProxyUrl);
    const res = await fetch(fileUrl, fetchOptions as RequestInit);
    assertArtifactResponse(res, fileUrl);

    if (!res.body) {
      throw new Error('Response body is null');
    }
    readStream = Readable.fromWeb(res.body as WebReadableStream) as unknown as ReadStream;
  }

  const writeStream = createWriteStream(filePathAtVolume);
  await pipeline(readStream, writeStream);

  return artifactFullPath;
};
