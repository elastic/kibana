/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

export class StreamTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`The stream is larger than ${maxBytes} bytes.`);
    this.name = 'StreamTooLargeError';
  }
}

export const streamToBuffer = (stream: Readable, { maxBytes }: { maxBytes?: number } = {}) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    stream.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (maxBytes !== undefined && totalBytes > maxBytes) {
        stream.destroy();
        reject(new StreamTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
