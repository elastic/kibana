/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Writable, pipeline } from 'stream';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { HttpAdapter as HttpAdapterType } from './adapters/http_adapter/adapter_type';
import { ArtifactStore } from './adapters/artifact_store/adapter_type';

const pipelineAsync = promisify(pipeline);
const ARTIFACT_BASE_PATH = 'https://artifacts.elastic.co/downloads';

export class ArtifactLib {
  constructor(
    private readonly store: ArtifactStore,
    private readonly httpAdapter: HttpAdapterType
  ) {}

  public async download(downloadPath: string) {
    const hasCacheEntry = await this.store.has(downloadPath);
    if (!hasCacheEntry) {
      const cacheStream = await this.store.setCacheStream(downloadPath);
      const downloadRes = await this.httpAdapter.get({
        baseURL: ARTIFACT_BASE_PATH,
        url: downloadPath,
        responseType: 'stream',
      });

      await pipelineAsync(downloadRes, cacheStream);

      const readCacheStream = this.store.getCacheStream(downloadPath);
      const [cacheSha512, expectedSha512File] = await Promise.all([
        getSha512(readCacheStream),
        await this.httpAdapter.get({
          baseURL: ARTIFACT_BASE_PATH,
          url: `${downloadPath}.sha512`,
          responseType: 'text',
        }),
      ]);
      const expectedSha512 = expectedSha512File.split(' ')[0];
      if (cacheSha512 !== expectedSha512) {
        await this.store.deleteCache(downloadPath);
        throw new Error(
          `Impossible to download ${downloadPath} invalid checksum.\n  Got: ${cacheSha512}\n  Expected: ${expectedSha512}`
        );
      }
    }
    return this.store.getCacheStream(downloadPath);
  }
}

async function getSha512(stream: NodeJS.ReadableStream): Promise<string> {
  let acc: Buffer = Buffer.from('');
  const accumulatorStream = new Writable({
    write: (chunk, encoding, callback) => {
      if (!acc) {
        acc = chunk;
      } else {
        acc = Buffer.concat([acc, chunk]);
      }
      callback();
    },
  });
  await pipelineAsync(stream, createHash('sha512'), accumulatorStream);
  return acc.toString('hex');
}
