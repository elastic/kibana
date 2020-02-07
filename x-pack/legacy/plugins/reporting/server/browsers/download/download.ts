/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSync, writeSync, closeSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';

import Axios from 'axios';

import { log } from './util';

/**
 * Download a url and calculate it's checksum
 * @param  {String} url
 * @param  {String} path
 * @return {Promise<String>} checksum of the downloaded file
 */
export async function download(url: string, path: string) {
  log(`Downloading ${url}`);

  const hash = createHash('md5');

  mkdirSync(dirname(path), { recursive: true });
  const handle = openSync(path, 'w');

  try {
    const resp = await Axios.request({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    resp.data.on('data', (chunk: Buffer) => {
      writeSync(handle, chunk);
      hash.update(chunk);
    });

    await new Promise((resolve, reject) => {
      resp.data.on('error', reject).on('end', resolve);
    });
  } finally {
    closeSync(handle);
  }

  return hash.digest('hex');
}
