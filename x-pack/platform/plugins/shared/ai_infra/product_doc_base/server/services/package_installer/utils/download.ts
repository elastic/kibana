/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReadStream, createReadStream } from 'fs';
import { access, stat } from 'fs/promises';
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

export interface DownloadToDiskResult {
  artifactFullPath: string;
  /** ISO 8601 last-modified time of the artifact, when available. */
  lastModified?: string;
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

const parseLastModifiedHeader = (headerValue: string | null): string | undefined => {
  if (!headerValue) {
    return undefined;
  }
  const timestamp = Date.parse(headerValue);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  // HTTP Last-Modified is second-precision; normalize so stored values match GCS list comparisons.
  return new Date(Math.floor(timestamp / 1000) * 1000).toISOString();
};

export const downloadToDisk = async (
  fileUrl: string,
  filePathAtVolume: string,
  artifactRepositoryProxyUrl?: string
): Promise<DownloadToDiskResult> => {
  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);
  let readStream: ReadStream;
  let lastModified: string | undefined;

  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol === 'file:') {
    const path = resolveLocalArtifactsPath(parsedUrl);
    const fileStat = await stat(path);
    lastModified = fileStat.mtime.toISOString();
    readStream = createReadStream(path);
  } else {
    const fetchOptions = getFetchOptions(fileUrl, artifactRepositoryProxyUrl);
    const res = await fetch(fileUrl, fetchOptions as RequestInit);
    assertArtifactResponse(res, fileUrl);
    lastModified = parseLastModifiedHeader(res.headers.get('last-modified'));

    if (!res.body) {
      throw new Error('Response body is null');
    }
    readStream = Readable.fromWeb(res.body as WebReadableStream) as unknown as ReadStream;
  }

  const writeStream = createWriteStream(filePathAtVolume);
  await pipeline(readStream, writeStream);

  return {
    artifactFullPath,
    ...(lastModified ? { lastModified } : {}),
  };
};
