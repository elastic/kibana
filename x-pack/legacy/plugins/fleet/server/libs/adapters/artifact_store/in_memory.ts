/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Writable, Duplex } from 'stream';
import { ArtifactStore } from './adapter_type';

/**
 * In memory store for artifacts, !For tests purpose only!
 */
export class InMemoryArtifactStore implements ArtifactStore {
  public cache: { [k: string]: Buffer } = {};

  public async has(key: string): Promise<boolean> {
    return !!this.cache[key];
  }

  public getCacheStream(key: string) {
    const stream = new Duplex();
    stream.push(this.cache[key]);
    stream.push(null);
    return stream;
  }

  public async setCacheStream(key: string) {
    let acc: Buffer;
    return new Writable({
      write: (chunk, encoding, callback) => {
        if (!acc) {
          acc = chunk;
        } else {
          acc = Buffer.concat([acc, chunk]);
        }
        callback();
      },
      final: callback => {
        this.cache[key] = acc;
        callback();
      },
    });
  }

  public async deleteCache(key: string) {
    delete this.cache[key];
  }
}
