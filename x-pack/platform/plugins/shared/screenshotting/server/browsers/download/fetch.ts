/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { mkdir, open } from 'fs/promises';
import { writeSync } from 'fs';
import { dirname } from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import type { Logger } from '@kbn/core/server';

/**
 * Download a url and calculate it's checksum
 */
export async function fetch(url: string, path: string, logger?: Logger): Promise<string> {
  logger?.info(`Downloading ${url} to ${path}`);

  const hash = createHash('sha256');

  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'w');
  try {
    const response = await globalThis.fetch(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const nodeStream = Readable.fromWeb(response.body as WebReadableStream);

    nodeStream.on('data', (chunk: Buffer) => {
      writeSync(handle.fd, chunk);
      hash.update(chunk);
    });

    await finished(nodeStream);
    logger?.info(`Downloaded ${url}`);
  } catch (error) {
    logger?.error(error);

    throw new Error(`Unable to download ${url}: ${error}`);
  } finally {
    await handle.close();
  }

  return hash.digest('hex');
}
