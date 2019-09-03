/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import { zipObject } from 'lodash';
import * as stream from 'stream';
import * as util from 'util';

const pipeline = util.promisify(stream.pipeline);

export type Hash = string;

export interface Integrities {
  [filePath: string]: Hash;
}

export async function getIntegrityHashes(filepaths: string[]): Promise<Integrities> {
  const hashes = await Promise.all(filepaths.map(getIntegrityHash));
  return zipObject(filepaths, hashes);
}

export async function getIntegrityHash(filepath: string): Promise<Hash | null> {
  try {
    const output = createHash('md5');

    await pipeline(fs.createReadStream(filepath), output);
    const data = output.read();
    if (data instanceof Buffer) {
      return data.toString('hex');
    }
    return data;
  } catch (err) {
    return null;
  }
}
