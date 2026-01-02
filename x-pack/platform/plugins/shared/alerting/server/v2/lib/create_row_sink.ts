/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'node:stream';

export interface CreateRowSink<T> {
  flushSize?: number;
  flush: (rows: T[]) => Promise<void>;
}

export function createRowSink<T>({ flushSize = 1000, flush }: CreateRowSink<T>) {
  const buffer: T[] = [];

  return new Writable({
    objectMode: true,
    async write(row, _enc, cb) {
      buffer.push(row);

      if (buffer.length >= flushSize) {
        try {
          await flush(buffer);
          buffer.length = 0;
          cb();
        } catch (e) {
          cb(e);
        }
      } else {
        cb();
      }
    },
    async final(cb) {
      if (buffer.length > 0) {
        try {
          await flush(buffer);
          cb();
        } catch (e) {
          cb(e);
        }
      } else {
        cb();
      }
    },
  });
}
