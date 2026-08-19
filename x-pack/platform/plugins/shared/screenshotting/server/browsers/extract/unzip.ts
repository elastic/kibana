/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { text as streamToText } from 'stream/consumers';

import { openPromise } from 'yauzl';
import { ExtractError } from './extract_error';

const UNIX_SYMLINK_TYPE = 10; // S_IFLNK = 0o12
const UNIX_FILE_TYPE_DIVISOR = 4096; // 2^12
const UNIX_MODE_DIVISOR = 65536; // 2^16

const guard = (origin: string, resolved: string) => {
  if (resolved !== origin && !resolved.startsWith(`${origin}${path.sep}`))
    throw new Error(`Path traversal attempt: "${resolved}" escapes "${origin}"`);
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
      const out = path.join(origin, entry.fileName);
      guard(origin, out);

      if (entry.fileName.endsWith('/')) {
        await fs.mkdir(out, { recursive: true });
        guard(origin, await fs.realpath(out));
        continue;
      }

      const parent = path.dirname(out);
      await fs.mkdir(parent, { recursive: true });
      const realParent = await fs.realpath(parent);
      guard(origin, realParent);

      const realOut = path.join(realParent, path.basename(out));

      const readStream = await zipfile.openReadStreamPromise(entry);

      if (isUnixSymlink(entry.externalFileAttributes)) {
        const linkTarget = await streamToText(readStream);
        const resolvedLink = path.join(realParent, linkTarget);
        guard(origin, resolvedLink);
        await fs.symlink(linkTarget, realOut);
      } else {
        await pipeline(readStream, createWriteStream(realOut));
      }
    }
  } catch (err) {
    throw new ExtractError(err);
  }
}
