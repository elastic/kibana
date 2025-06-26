/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream } from 'fs';
import { mkdir, open } from 'fs/promises';
import { pipeline } from 'stream/promises';
import Path from 'path';
import fetch from 'node-fetch';

export type MimeType =
  | 'application/json'
  | 'application/x-ndjson'
  | 'text/plain'
  | 'application/zip'
  | 'application/gzip'
  | 'application/x-gzip'
  | 'application/octet-stream';

const validatePath = (filePath: string): void => {
  const dirPath = Path.dirname(filePath);
  const normalizedPath = Path.normalize(filePath);

  if (normalizedPath.startsWith('..') || !normalizedPath.startsWith(dirPath)) {
    throw new Error('Path traversal attempt detected');
  }
};

const validateMimeType = (contentType: string | null, expectedMimeType: MimeType): void => {
  if (!contentType) {
    throw new Error('Missing Content-Type header');
  }

  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (mimeType !== expectedMimeType.toLowerCase()) {
    throw new Error(`Invalid MIME type: ${mimeType}. Expected: ${expectedMimeType}`);
  }
};

const validateFileSignature = (buffer: Buffer, expectedMimeType: MimeType): void => {
  const firstBytes = buffer.subarray(0, 8);

  switch (expectedMimeType) {
    case 'application/zip':
      if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4b) {
        throw new Error('File content does not match ZIP format');
      }
      break;
    default:
      throw new Error(
        `File signature validation is not supported for MIME type: ${expectedMimeType}`
      );
  }
};

const readFileHeader = async (filePath: string, bytesToRead: number = 8): Promise<Buffer> => {
  const fileHandle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await fileHandle.close();
  }
};

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

  const fileBuffer = await readFileHeader(filePath);

  validateFileSignature(fileBuffer, expectedMimeType);
};
