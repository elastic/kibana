/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Writable, pipeline } from 'stream';
import Boom from 'boom';
import { promisify } from 'util';
import { createHash } from 'crypto';
import path from 'path';
import { HttpAdapter as HttpAdapterType } from './adapters/http_adapter/adapter_type';
import { ArtifactStore } from './adapters/artifact_store/adapter_type';

const pipelineAsync = promisify(pipeline);
const ARTIFACT_BASE_PATH = 'https://artifacts.elastic.co/downloads';
const ARTIFACT_ROOT_PATH = 'https://artifacts.elastic.co';
const GCP_KEY_PATH = 'GPG-KEY-elasticsearch';

export class ArtifactLib {
  constructor(
    private readonly store: ArtifactStore,
    private readonly httpAdapter: HttpAdapterType
  ) {}

  public async download(downloadPath: string) {
    const hasCacheEntry = await this.store.has(downloadPath);
    if (!hasCacheEntry) {
      const cacheStream = await this.store.setCacheStream(downloadPath);
      try {
        const downloadRes = await this.httpAdapter.get({
          baseURL: GCP_KEY_PATH === downloadPath ? ARTIFACT_ROOT_PATH : ARTIFACT_BASE_PATH,
          url: downloadPath,
          responseType: 'stream',
        });

        await pipelineAsync(downloadRes, cacheStream);
      } catch (error) {
        if (error.isAxiosError && error.response.status === 404) {
          throw Boom.notFound(`File not found ${downloadPath}`);
        }
        throw error;
      }

      if (
        GCP_KEY_PATH !== downloadPath &&
        ['.sha512', '.asc'].indexOf(path.extname(downloadPath)) < 0
      ) {
        await this._verifySHA512(downloadPath);
      }
    }
    return this.store.getCacheStream(downloadPath);
  }

  private async _verifySHA512(downloadPath: string) {
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
