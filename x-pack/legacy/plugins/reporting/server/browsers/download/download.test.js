/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { resolve as resolvePath } from 'path';
import { readFileSync } from 'fs';

import del from 'del';
import { download } from './download';

const TEMP_DIR = resolvePath(__dirname, '__tmp__');
const TEMP_FILE = resolvePath(TEMP_DIR, 'foo/bar/download');

jest.mock('request', () => {
  let resp = '';
  const sinon = require('sinon');
  const Readable = require('stream').Readable;
  const request = sinon.spy(function () {
    return new Readable({
      read() {
        if (resp instanceof Error) {
          this.emit('error', resp);
          return;
        }

        this.push(resp.shift());

        if (resp.length === 0) {
          this.push(null);
        }
      }
    });
  });

  request._setResponse = (chunks) => {
    if (typeof chunks === 'string') {
      chunks = chunks.split('');
    }

    resp = chunks;
  };

  return request;
});

test('downloads the url to the path', async () => {
  const BODY = 'abdcefg';
  require('request')._setResponse(BODY);

  await download('url', TEMP_FILE);
  expect(readFileSync(TEMP_FILE, 'utf8')).toEqual(BODY);
});

test('returns the md5 hex hash of the http body', async () => {
  const BODY = 'foobar';
  const HASH = createHash('md5').update(BODY).digest('hex');
  require('request')._setResponse(BODY);

  const returned = await download('url', TEMP_FILE);
  expect(returned).toEqual(HASH);
});

test('throws if request emits an error', async () => {
  require('request')._setResponse(new Error('foo'));
  return expect(download('url', TEMP_FILE)).rejects.toThrow('foo');
});

afterEach(async () => (
  await del(TEMP_DIR)
));
