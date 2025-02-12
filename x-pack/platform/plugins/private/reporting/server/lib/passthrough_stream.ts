/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';

export class PassThroughStream extends PassThrough {
  private onFirstByte?(): void;

  bytesWritten = 0;

  firstBytePromise = new Promise<void>((resolve) => {
    this.onFirstByte = resolve;
  });

  _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    const size = Buffer.isBuffer(chunk) ? chunk.byteLength : chunk.length;

    if (!this.bytesWritten && size) {
      this.onFirstByte?.();
    }
    this.bytesWritten += size;

    return super._write(chunk, encoding, callback);
  }
}
