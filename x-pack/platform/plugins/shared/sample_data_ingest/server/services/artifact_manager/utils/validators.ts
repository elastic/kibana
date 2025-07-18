/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Path from 'path';
import { URL } from 'url';
import { open } from 'fs/promises';

export type MimeType =
  | 'application/json'
  | 'application/x-ndjson'
  | 'text/plain'
  | 'application/zip'
  | 'application/gzip'
  | 'application/x-gzip'
  | 'application/xml';

// Protects against path traversal attacks in file paths
export const validatePath = (filePath: string): void => {
  const dirPath = Path.dirname(filePath);
  const normalizedPath = Path.normalize(filePath);

  if (normalizedPath.includes('..') || (dirPath !== '.' && !normalizedPath.startsWith(dirPath))) {
    throw new Error('Path traversal attempt detected');
  }
};

// Validates URLs to prevent malicious protocol usage and path traversal
export const validateUrl = (urlString: string): void => {
  try {
    const parsedUrl = new URL(urlString);

    const allowedProtocols = ['http:', 'https:', 'file:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }
  } catch (error) {
    throw error;
  }
};

// Validates HTTP Content-Type headers against expected MIME types
export const validateMimeType = (contentType: string | null, expectedMimeType: MimeType): void => {
  if (!contentType) {
    throw new Error('Missing Content-Type header');
  }

  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (mimeType !== expectedMimeType.toLowerCase()) {
    throw new Error(`Invalid MIME type: ${mimeType}. Expected: ${expectedMimeType}`);
  }
};

// Validates file signatures to prevent file type spoofing
export const validateFileSignature = async (
  filePath: string,
  expectedMimeType: MimeType
): Promise<void> => {
  const fileBuffer = await readFileHeader(filePath);
  const firstBytes = fileBuffer.subarray(0, 8);

  switch (expectedMimeType) {
    case 'application/zip':
      if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4b) {
        throw new Error('File content does not match ZIP format');
      }
      break;
    case 'application/xml':
      if (firstBytes[0] !== 0x3c || firstBytes[1] !== 0x3f) {
        throw new Error('File content does not match XML format');
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
