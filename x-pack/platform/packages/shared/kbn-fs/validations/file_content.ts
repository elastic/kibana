/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Stream } from 'stream';
import type { WriteFileContent } from '../types';
import { sanitizeSvg } from '../sanitizations/svg';
import { validateFileSize } from './file_size';

import { validateMimeType } from './file_mimetype';

type ValidatedContent<T> = T extends Iterable<unknown>
  ? Buffer
  : T extends Stream | AsyncIterable<unknown>
  ? T // Preserve original type for Stream/AsyncIterable
  : T | Buffer;

export function validateAndSanitizeFileData<T extends WriteFileContent>(
  data: T,
  filePath: string
): ValidatedContent<T> {
  const dataBuffer = toBuffer(data);

  // If data cannot be converted to a Buffer (e.g. AsyncIterable or Stream), return the original data
  if (!dataBuffer) {
    return data as ValidatedContent<T>;
  }

  validateFileSize(dataBuffer);
  const possibleMimeTypes = validateMimeType(dataBuffer, filePath);

  if (possibleMimeTypes.includes('image/svg+xml')) {
    try {
      return sanitizeSvg(dataBuffer) as ValidatedContent<T>;
    } catch (error) {
      throw new Error(`Failed to sanitize SVG content: ${error.message}`);
    }
  }

  return dataBuffer as ValidatedContent<T>;
}

function isObjectWithBufferProperty(data: unknown): data is { buffer: Buffer } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'buffer' in data &&
    Buffer.isBuffer((data as unknown as { buffer: Buffer }).buffer)
  );
}

function isIterable(data: unknown): data is Iterable<string | NodeJS.ArrayBufferView> {
  return data !== null && typeof data === 'object' && Symbol.iterator in data;
}

function toBuffer(data: WriteFileContent): Buffer | null {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'utf8');
  }

  if (isObjectWithBufferProperty(data)) {
    return (data as { buffer: Buffer }).buffer;
  }

  if (isIterable(data)) {
    const chunks: Buffer[] = [];
    for (const chunk of data as Iterable<string | NodeJS.ArrayBufferView>) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (ArrayBuffer.isView(chunk)) {
        chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf8'));
      } else {
        throw new Error('Unsupported chunk type in Iterable');
      }
    }

    return Buffer.concat(chunks);
  }

  return null;
}
