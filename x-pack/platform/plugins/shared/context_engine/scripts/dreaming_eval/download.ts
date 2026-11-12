/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import type { ToolingLog } from '@kbn/tooling-log';

const open = async (url: string): Promise<Readable> => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Download of ${url} failed: ${response.status} ${response.statusText}`);
  }
  return Readable.fromWeb(response.body as unknown as WebReadableStream);
};

/** Downloads a file once; later calls reuse it unless `force` is set. */
export const downloadFile = async ({
  url,
  dest,
  force,
  log,
}: {
  url: string;
  dest: string;
  force: boolean;
  log: ToolingLog;
}): Promise<string> => {
  if (!force && fs.existsSync(dest)) {
    log.debug(`Using downloaded ${dest}`);
    return dest;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  log.info(`Downloading ${url}`);
  const partial = `${dest}.partial`;
  await pipeline(await open(url), fs.createWriteStream(partial));
  fs.renameSync(partial, dest);
  return dest;
};

/** Streams the lines of a remote file without keeping it, for files too large to download. */
export async function* streamRemoteLines(url: string): AsyncGenerator<string> {
  const input = await open(url);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  } finally {
    lines.close();
    input.destroy();
  }
}

/**
 * Reads the elements of a file's top-level JSON array one at a time, for files too large to parse
 * whole: LongMemEval M is 2.7 GB, past the longest string Node can hold.
 */
export async function* streamJsonArray<T>(
  chunks: AsyncIterable<string | Buffer>
): AsyncGenerator<T> {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let parts: string[] = [];
  for await (const raw of chunks) {
    const chunk = typeof raw === 'string' ? raw : raw.toString('utf8');
    let start = depth > 1 ? 0 : -1;
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        depth++;
        if (depth === 2) {
          start = i;
        }
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 1) {
          parts.push(chunk.slice(start, i + 1));
          yield JSON.parse(parts.join('')) as T;
          parts = [];
          start = -1;
        }
      }
    }
    if (depth > 1 && start !== -1) {
      parts.push(chunk.slice(start));
    }
  }
}

const READ_CHUNK_BYTES = 1024 * 1024;

/** The elements of a JSON array file, read as a stream. */
export const streamJsonArrayFile = <T>(file: string): AsyncGenerator<T> =>
  streamJsonArray<T>(
    fs.createReadStream(file, { encoding: 'utf8', highWaterMark: READ_CHUNK_BYTES })
  );

export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
