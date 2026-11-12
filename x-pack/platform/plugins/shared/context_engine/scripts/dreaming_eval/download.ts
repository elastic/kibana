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

export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
