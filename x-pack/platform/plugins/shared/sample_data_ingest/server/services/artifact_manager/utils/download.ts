/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';

import { createWriteStream, getSafePath } from '@kbn/fs';
import { pipeline } from 'stream/promises';
import { validateMimeType, validateFileSignature, type MimeType } from './validators';

export const download = async (
  fileUrl: string,
  filePathAtVolume: string,
  expectedMimeType: MimeType,
  abortController?: AbortController
): Promise<string> => {
  const writeStream = createWriteStream(filePathAtVolume);

  let res: Response;

  try {
    res = await fetch(fileUrl, {
      signal: abortController?.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      writeStream.destroy();
      throw new Error('Download aborted');
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  validateMimeType(res.headers.get('content-type'), expectedMimeType);

  if (!res.body) {
    throw new Error('Response body is null');
  }

  try {
    await pipeline(Readable.fromWeb(res.body as WebReadableStream), writeStream);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      writeStream.destroy();
      throw new Error('Download aborted during streaming');
    }
    throw err;
  }

  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);

  await validateFileSignature(artifactFullPath, expectedMimeType);

  return artifactFullPath;
};
