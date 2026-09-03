/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { readFile, lstat } from 'fs/promises';
import path from 'path';
import mockFs from 'mock-fs';
import { ExtractError } from './extract_error';
import { unzip } from './unzip';

const readFixture = (name: string) => readFileSync(path.resolve(__dirname, '__fixtures__', name));

const TEST_ZIP = readFixture('test.zip');
const PATH_TRAVERSAL_ZIP = readFixture('path_traversal.zip');
const SYMLINK_ESCAPE_ZIP = readFixture('symlink_escape.zip');
const SYMLINK_OK_ZIP = readFixture('symlink_ok.zip');

describe('unzip', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('should extract zipped contents', async () => {
    mockFs({
      '/test.zip': TEST_ZIP,
    });

    await unzip('/test.zip', '/output');
    await expect(readFile('/output/test.txt', 'utf8')).resolves.toEqual('test');
  });

  it('should reject on invalid archive', async () => {
    mockFs({
      '/invalid.zip': 'test',
    });
    await expect(unzip('/invalid.zip', '/output')).rejects.toBeInstanceOf(ExtractError);
  });

  it('extracts files inside the target folder when the zip contents contain an entry with ../ that lands outside the defined target', async () => {
    mockFs({
      '/path_traversal.zip': PATH_TRAVERSAL_ZIP,
      '/output': {},
    });

    await expect(unzip('/path_traversal.zip', '/output')).resolves.toBeUndefined();
    expect(existsSync('/output/escaped.txt')).toEqual(true);
    expect(existsSync('/escaped.txt')).toEqual(false);
  });

  it('does not follow zip symlinks whose target lands outside the origin path', async () => {
    mockFs({
      '/symlink_escape.zip': SYMLINK_ESCAPE_ZIP,
      '/output': {},
    });

    await expect(unzip('/symlink_escape.zip', '/output')).resolves.toBeUndefined();
    expect(existsSync('/escaped.txt')).toEqual(false);
    expect(existsSync('/output/escaped.txt')).toEqual(false);
    expect(existsSync('/output/symlink_escape/escaped.txt')).toEqual(false);

    expect(existsSync('/output/symlink_escape/link')).toEqual(true);
    expect((await lstat('/output/symlink_escape/link')).isSymbolicLink()).toEqual(false);
  });

  it('extracts zip entries whose symlink target stays inside the origin path', async () => {
    mockFs({
      '/symlink_ok.zip': SYMLINK_OK_ZIP,
      '/output': {},
    });

    await expect(unzip('/symlink_ok.zip', '/output')).resolves.toBeUndefined();
    await expect(readFile('/output/inside.txt', 'utf8')).resolves.toEqual('ok');
  });
});
