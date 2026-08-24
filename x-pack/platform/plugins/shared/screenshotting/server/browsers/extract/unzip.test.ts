/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import mockFs from 'mock-fs';
import { ExtractError } from './extract_error';
import { unzip } from './unzip';

const readFixture = (name: string) => readFileSync(path.resolve(__dirname, '__fixtures__', name));

const TEST_ZIP = Buffer.from(
  'UEsDBAoAAgAAANh0ElMMfn/YBAAAAAQAAAAIABwAdGVzdC50eHRVVAkAA1f/HGFX/xxhdXgLAAEE9QEAAAQUAAAAdGVzdFBLAQIeAwoAAgAAANh0ElMMfn/YBAAAAAQAAAAIABgAAAAAAAEAAACkgQAAAAB0ZXN0LnR4dFVUBQADV/8cYXV4CwABBPUBAAAEFAAAAFBLBQYAAAAAAQABAE4AAABGAAAAAAA=',
  'base64'
);
const PATH_TRAVERSAL_ZIP = readFixture('path_traversal.zip');
const SYMLINK_ESCAPE_ZIP = readFixture('symlink_escape.zip');
const SYMLINK_OK_ZIP = readFixture('symlink_ok.zip');

describe('unzip', () => {
  afterEach(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    mockFs({
      '/test.zip': TEST_ZIP,
      '/invalid.zip': 'test',
    });
  });

  it('should extract zipped contents', async () => {
    await unzip('/test.zip', '/output');
    await expect(readFile('/output/test.txt', 'utf8')).resolves.toBe('test');
  });

  it('should reject on invalid archive', async () => {
    await expect(unzip('/invalid.zip', '/output')).rejects.toBeInstanceOf(ExtractError);
  });

  it('does not extract an entry path that uses ../ to leave the origin directory', async () => {
    mockFs({
      '/path_traversal.zip': PATH_TRAVERSAL_ZIP,
      '/output': {},
    });

    await expect(unzip('/path_traversal.zip', '/output')).rejects.toBeInstanceOf(ExtractError);
    expect(existsSync('/escaped.txt')).toBe(false);
  });

  it('does not follow zip symlinks whose target lands outside the origin path', async () => {
    mockFs({
      '/symlink_escape.zip': SYMLINK_ESCAPE_ZIP,
      '/output': {},
    });

    await expect(unzip('/symlink_escape.zip', '/output')).rejects.toBeInstanceOf(ExtractError);
    expect(existsSync('/escaped.txt')).toBe(false);
    expect(existsSync('/output/escaped.txt')).toBe(false);
  });

  it('extracts zip entries whose symlink target stays inside the origin path', async () => {
    mockFs({
      '/symlink_ok.zip': SYMLINK_OK_ZIP,
      '/output': {},
    });

    await unzip('/symlink_ok.zip', '/output');
    await expect(readFile('/output/inside.txt', 'utf8')).resolves.toBe('ok');
  });
});
