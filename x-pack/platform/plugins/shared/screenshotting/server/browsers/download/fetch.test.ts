/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve as resolvePath } from 'path';
import { fetch } from './fetch';

const createMockResponse = (body: string, status = 200): Response => {
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from(body));
      controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
    body: readable,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(body),
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    bytes: jest.fn(),
  } as unknown as Response;
};

describe('fetch', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'fetch-test-'));
    tempFile = resolvePath(tempDir, 'foo/bar/download');

    jest.spyOn(global, 'fetch').mockResolvedValue(createMockResponse('foobar'));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  test('downloads the url to the path', async () => {
    await fetch('url', tempFile);

    await expect(readFile(tempFile, 'utf8')).resolves.toBe('foobar');
  });

  test('returns the sha256 hex hash of the http body', async () => {
    const hash = createHash('sha256').update('foobar').digest('hex');

    await expect(fetch('url', tempFile)).resolves.toEqual(hash);
  });

  test('throws if request emits an error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('foo');
    });

    await expect(fetch('url', tempFile)).rejects.toThrow('foo');
  });
});
