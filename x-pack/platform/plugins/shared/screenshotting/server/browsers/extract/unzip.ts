/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { openPromise } from 'yauzl';

import { ExtractError } from './extract_error';

const MAX_SYMLINK_TARGET_BYTES = 4096; // PATH_MAX
const UNIX_SYMLINK_TYPE = 10; // S_IFLNK = 0o12
const UNIX_FILE_TYPE_DIVISOR = 4096; // 2^12
const UNIX_MODE_DIVISOR = 65536; // 2^16

const checkTargetDestination = (origin: string, target: string) => {
  if (target !== origin && !target.startsWith(`${origin}${path.sep}`)) {
    throw new Error(`Path traversal attempt: "${target}" escapes "${origin}"`);
  }
};

/** A zip symlink entry stores its target path as the entry's content. */
const readSymlinkTarget = async (readStream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of readStream) {
    size += chunk.length;
    if (size > MAX_SYMLINK_TARGET_BYTES) {
      readStream.destroy();
      throw new Error(`Symlink target exceeds ${MAX_SYMLINK_TARGET_BYTES} bytes`);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8').trim();
};

const isUnixSymlink = (externalFileAttributes: number): boolean => {
  const unixMode = Math.floor(externalFileAttributes / UNIX_MODE_DIVISOR);
  return Math.floor(unixMode / UNIX_FILE_TYPE_DIVISOR) === UNIX_SYMLINK_TYPE;
};

export async function unzip(filepath: string, target: string) {
  try {
    const origin = path.resolve(target);
    const zipfile = await openPromise(filepath);

    for await (const entry of zipfile.eachEntry()) {
      const fullPath = path.join(origin, entry.fileName);
      const parent = path.dirname(fullPath);
      checkTargetDestination(origin, fullPath);

      if (entry.fileName.endsWith('/')) {
        continue;
      }

      const isSymlink = isUnixSymlink(entry.externalFileAttributes);
      await fs.mkdir(parent, { recursive: true });
      const readStream = await zipfile.openReadStreamPromise(entry);

      if (isSymlink) {
        const linkTarget = await readSymlinkTarget(readStream);
        const resolvedLink = path.resolve(parent, linkTarget);
        checkTargetDestination(origin, resolvedLink);
        await fs.symlink(linkTarget, fullPath);
      } else {
        await pipeline(readStream, createWriteStream(fullPath));
        // would need chmod somewhere here
      }
    }
  } catch (err) {
    throw new ExtractError(err);
  }
}
