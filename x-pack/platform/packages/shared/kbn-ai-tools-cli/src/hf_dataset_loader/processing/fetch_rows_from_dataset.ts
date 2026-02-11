/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import { createGunzip } from 'zlib';
import * as readline from 'node:readline';
import { pickBy } from 'lodash';
import { format } from 'util';
import Papa from 'papaparse';
import type { HuggingFaceDatasetSpec } from '../types';
import { createFileStream } from '../huggingface_utils';

function toMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + 'mb';
}

function convertToDocument(
  rawRecord: Record<string, unknown>,
  dataset: HuggingFaceDatasetSpec
): Record<string, unknown> {
  const doc = dataset.mapDocument(rawRecord);
  const cleanedDoc = pickBy(doc, (val) => val !== undefined && val !== null && val !== '');
  return cleanedDoc;
}

async function readFromCsv(
  decompressed: Readable,
  dataset: HuggingFaceDatasetSpec,
  logger: Logger,
  limit?: number
): Promise<Array<Record<string, unknown>>> {
  const docs: Array<Record<string, unknown>> = [];

  return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    let rowCount = 0;

    const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    csvStream.on('data', (row: Record<string, unknown>) => {
      rowCount++;

      try {
        const document = convertToDocument(row, dataset);
        docs.push(document);

        if (limit !== undefined && docs.length >= limit) {
          logger.debug(`Reached limit of ${limit} documents`);
          csvStream.destroy();
          resolveWithCleanup(docs);
          return;
        }
      } catch (error) {
        logger.error(`Error processing CSV row ${rowCount}: ${error}`);
      }
    });

    csvStream.on('end', () => {
      logger.info(`CSV parsing complete. Processed ${rowCount} rows, ${docs.length} documents`);
      resolveWithCleanup(docs);
    });

    csvStream.on('error', (error: Error) => {
      logger.error(`CSV stream error: ${error.message}`);
      reject(error);
    });

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      logger.error('CSV parsing timeout after 3 minutes');
      reject(new Error('CSV parsing timeout'));
    }, 3 * 60 * 1000); // 3 minutes

    // Override resolve to clear timeout
    const originalResolve = resolve;
    const resolveWithCleanup = (result: Array<Record<string, unknown>>) => {
      clearTimeout(timeout);
      originalResolve(result);
    };

    decompressed.pipe(csvStream);
  });
}

async function readFromJson(
  decompressed: Readable,
  dataset: HuggingFaceDatasetSpec,
  logger: Logger,
  limit?: number
): Promise<Array<Record<string, unknown>>> {
  const docs: Array<Record<string, unknown>> = [];
  const rl = readline.createInterface({ input: decompressed, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    const raw = JSON.parse(line);

    const document = convertToDocument(raw, dataset);
    docs.push(document);

    if (limit !== undefined && docs.length >= limit) {
      logger.debug(`Reached limit of ${limit} documents`);
      break;
    }
  }

  return docs;
}

export async function fetchRowsFromDataset({
  dataset,
  logger,
  limit,
  accessToken,
}: {
  dataset: HuggingFaceDatasetSpec;
  logger: Logger;
  limit?: number;
  accessToken: string;
}): Promise<Array<Record<string, unknown>>> {
  const {
    stream: inputStream,
    size,
    isGzip,
  } = await createFileStream(
    {
      repo: dataset.repo,
      path: dataset.file,
      revision: dataset.revision ?? 'main',
      accessToken,
      hubUrl: 'https://huggingface.co/datasets',
    },
    logger
  );

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

  // Check if this is a CSV file based on the file extension
  const isCSV = dataset.file.toLowerCase().endsWith('.csv');

  const docs = isCSV
    ? await readFromCsv(decompressed, dataset, logger, limit)
    : await readFromJson(decompressed, dataset, logger, limit);

  inputStream.destroy();

  logger.debug(`Fetched ${docs.length} rows for ${dataset.name}`);

  return docs;
}
