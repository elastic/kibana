/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transform, TransformCallback, PassThrough } from 'stream';

export class Rereadable extends Transform {
  private chunks: any[] = [];

  _transform(chunk: any, encoding: string, callback: TransformCallback) {
    this.chunks.push(chunk);
    callback();
  }

  reread() {
    const stream = new PassThrough();
    this.chunks.forEach(chunk => stream.write(chunk));
    return stream;
  }
}
