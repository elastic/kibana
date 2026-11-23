/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve as resolvePath } from 'path';
import { Readable } from 'stream';
import { fetch } from './fetch';

describe('fetch', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'screenshotting-fetch-'));
    tempFile = resolvePath(tempDir, 'foo/bar/download');
    jest.spyOn(axios, 'request').mockResolvedValue({
      data: new Readable({
        read() {
          this.push('foobar');
          this.push(null);
        },
      }),
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    jest.resetAllMocks();
  });

  test('downloads the url to the path', async () => {
    await fetch('url', tempFile);

    await expect(readFile(tempFile, 'utf8')).resolves.toBe('foobar');
  });

  test('returns the sha1 hex hash of the http body', async () => {
    const hash = createHash('sha256').update('foobar').digest('hex');

    await expect(fetch('url', tempFile)).resolves.toEqual(hash);
  });

  test('throws if request emits an error', async () => {
    (axios.request as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('foo');
    });

    await expect(fetch('url', tempFile)).rejects.toThrow('foo');
  });
});
