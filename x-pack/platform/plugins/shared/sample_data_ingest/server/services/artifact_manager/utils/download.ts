/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream, getSafePath } from '@kbn/fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import { validateMimeType, validateFileSignature, type MimeType } from './validators';

export const download = async (
  fileUrl: string,
  filePathAtVolume: string,
  expectedMimeType: MimeType,
  abortController?: AbortController
): Promise<string> => {
  const writeStream = createWriteStream(filePathAtVolume);

  const res = await fetch(fileUrl);

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  validateMimeType(res.headers.get('content-type'), expectedMimeType);

  if (!res.body) {
    throw new Error('Response body is null');
  }

  await pipeline(res.body, writeStream);

  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);

  await validateFileSignature(artifactFullPath, expectedMimeType);

  return artifactFullPath;
};
