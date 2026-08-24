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
import { openPromise } from 'yauzl';

import { ExtractError } from './extract_error';

const guard = (origin: string, resolved: string) => {
  if (resolved !== origin && !resolved.startsWith(`${origin}${path.sep}`))
    throw new Error(`Path traversal attempt: "${resolved}" escapes "${origin}"`);
};

const isUnixSymlink = async (path: string): Promise<boolean> => {
  const stats = await fs.lstat(path);
  return stats.isSymbolicLink();
};

export async function unzip(filepath: string, target: string) {
  try {
    const origin = path.resolve(target);
    const zipfile = await openPromise(filepath);

    for await (const entry of zipfile.eachEntry()) {
      const fullPath = path.join(origin, entry.fileName);
      const parent = path.dirname(fullPath);
      await fs.mkdir(parent, { recursive: true });
      const realParent = await fs.realpath(parent);

      guard(origin, realParent);

      if (entry.fileName.endsWith('/')) {
        continue;
      }

      const isSymlink = await isUnixSymlink(realParent);

      if (isSymlink) {
        const linkTarget = await fs.readlink(fullPath);
        const resolvedLink = path.join(parent, linkTarget);
        guard(origin, resolvedLink);
        await fs.symlink(linkTarget, fullPath);
      } else {
        guard(origin, fullPath);
        const readStream = await zipfile.openReadStreamPromise(entry);
        await pipeline(readStream, createWriteStream(fullPath));
      }
    }
  } catch (err) {
    throw new ExtractError(err);
  }
}
