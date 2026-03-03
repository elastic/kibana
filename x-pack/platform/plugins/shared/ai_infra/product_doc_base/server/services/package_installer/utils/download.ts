/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReadStream, createReadStream } from 'fs';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { createWriteStream, getSafePath } from '@kbn/fs';
import { pipeline } from 'stream/promises';
import { resolveLocalArtifactsPath } from './local_artifacts';
import { getFetchOptions } from '../../proxy';

export const downloadToDisk = async (
  fileUrl: string,
  filePathAtVolume: string,
  artifactRepositoryProxyUrl?: string
): Promise<string> => {
  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);
  const writeStream = createWriteStream(filePathAtVolume);
  let readStream: ReadStream;

  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol === 'file:') {
    const path = resolveLocalArtifactsPath(parsedUrl);
    readStream = createReadStream(path);
  } else {
    const fetchOptions = getFetchOptions(fileUrl, artifactRepositoryProxyUrl);
    const res = await fetch(fileUrl, fetchOptions as RequestInit);

    if (!res.body) {
      throw new Error('Response body is null');
    }
    readStream = Readable.fromWeb(res.body as WebReadableStream) as unknown as ReadStream;
  }

  await pipeline(readStream, writeStream);

  return artifactFullPath;
};
