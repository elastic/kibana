/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import Path from 'path';
import fetch from 'node-fetch';
import { validatePath, validateMimeType, validateFileSignature, type MimeType } from './validators';

export const download = async (fileUrl: string, filePath: string, expectedMimeType: MimeType) => {
  validatePath(filePath);

  const dirPath = Path.dirname(filePath);

  await mkdir(dirPath, { recursive: true });
  const writeStream = createWriteStream(filePath);

  const res = await fetch(fileUrl);

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  validateMimeType(res.headers.get('content-type'), expectedMimeType);

  if (!res.body) {
    throw new Error('Response body is null');
  }

  await pipeline(res.body, writeStream);

  await validateFileSignature(filePath, expectedMimeType);
};
