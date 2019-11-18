/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';

import { readableEnd } from './util';

export async function md5(path: string) {
  const hash = createHash('md5');
  await readableEnd(createReadStream(path).on('data', chunk => hash.update(chunk)));
  return hash.digest('hex');
}
