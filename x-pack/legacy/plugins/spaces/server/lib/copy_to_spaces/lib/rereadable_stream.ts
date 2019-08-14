/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transform, TransformCallback, Readable } from 'stream';

export class Rereadable extends Transform {
  private chunks: any[] = [];

  constructor() {
    super({ writableObjectMode: true, readableObjectMode: true });
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback) {
    this.chunks.push(chunk);
    callback(undefined, chunk);
  }

  reread() {
    const queue = [...this.chunks];
    return new Readable({
      objectMode: true,
      read() {
        queue.forEach(chunk => this.push(chunk));
        this.push(null);
      },
    });
  }
}
