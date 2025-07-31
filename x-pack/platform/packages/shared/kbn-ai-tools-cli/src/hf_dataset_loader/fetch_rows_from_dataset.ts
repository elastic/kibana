/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileDownloadInfo } from '@huggingface/hub';
import { Logger } from '@kbn/core/server';
import streamWeb from 'stream/web';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import * as readline from 'node:readline';
import { pickBy } from 'lodash';
import { format } from 'util';
import { HuggingFaceDatasetSpec } from './types';

function toMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + 'mb';
}

export async function fetchRowsFromDataset({
  dataset,
  logger,
  limit = 1000,
  accessToken,
}: {
  dataset: HuggingFaceDatasetSpec;
  logger: Logger;
  limit?: number;
  accessToken: string;
}): Promise<Array<Record<string, unknown>>> {
  const options = {
    repo: dataset.repo,
    path: dataset.file,
    revision: dataset.revision ?? 'main',
    hubUrl: `https://huggingface.co/datasets`,
    accessToken,
  };

  const fileInfo = await fileDownloadInfo(options);

  if (!fileInfo) {
    throw new Error(
      `Cannot fetch files for dataset (${dataset.repo}/${dataset.file}@${options.revision})`
    );
  }

  const { url, size } = fileInfo;

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }

  const inputStream = Readable.fromWeb(res.body as unknown as streamWeb.ReadableStream<any>);

  const isGzip = new URL(url).searchParams.get('response-content-type') === 'application/gzip';

  const totalMb = toMb(size);

  let downloadedBytes = 0;

  let lastDownloadLog = Date.now();

  inputStream.on('data', (chunk: Buffer) => {
    downloadedBytes += chunk.length;
    const now = Date.now();
    if (now - lastDownloadLog >= 10_000) {
      lastDownloadLog = now;
      const downloadedMb = toMb(downloadedBytes);
      logger.info(`Downloading ${dataset.name}: ${downloadedMb} out of ${totalMb} so far`);
      lastDownloadLog = now;
    }
  });

  inputStream.on('end', () => {
    logger.debug('Completed download');
  });

  inputStream.on('error', (err) => {
    logger.debug(`Ended download prematurely: ${format(err)}`);
  });

  const decompressed: Readable = isGzip ? inputStream.pipe(createGunzip()) : inputStream;

  const rl = readline.createInterface({ input: decompressed, crlfDelay: Infinity });

  const docs: Array<Record<string, unknown>> = [];
  for await (const line of rl) {
    if (!line) continue;
    const raw = JSON.parse(line);
    const doc = dataset.mapDocument(raw);
    docs.push(pickBy(doc, (val) => val !== undefined && val !== null && val !== ''));

    if (docs.length === limit) {
      break;
    }
  }

  inputStream.destroy();

  logger.debug(`Fetched ${docs.length} rows for ${dataset.name}`);

  return docs;
}
