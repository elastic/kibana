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

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { readFile, lstat } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { ExtractError } from './extract_error';
import { unzip } from './unzip';

const readFixture = (name: string) => readFileSync(path.resolve(__dirname, '__fixtures__', name));

const TEST_ZIP = readFixture('test.zip');
const PATH_TRAVERSAL_ZIP = readFixture('path_traversal.zip');
const SYMLINK_ESCAPE_ZIP = readFixture('symlink_escape.zip');
const SYMLINK_OK_ZIP = readFixture('symlink_ok.zip');

let tmpDir: string;
const tmpPath = (name: string) => path.join(tmpDir, name);

describe('unzip', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'screenshotting-unzip-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should extract zipped contents', async () => {
    writeFileSync(tmpPath('test.zip'), TEST_ZIP);

    await unzip(tmpPath('test.zip'), tmpPath('output'));
    await expect(readFile(tmpPath('output/test.txt'), 'utf8')).resolves.toEqual('test');
  });

  it('should reject on invalid archive', async () => {
    writeFileSync(tmpPath('invalid.zip'), 'test');
    await expect(unzip(tmpPath('invalid.zip'), tmpPath('output'))).rejects.toBeInstanceOf(
      ExtractError
    );
  });

  it('extracts files inside the target folder when the zip contents contain an entry with ../ that lands outside the defined target', async () => {
    writeFileSync(tmpPath('path_traversal.zip'), PATH_TRAVERSAL_ZIP);
    mkdirSync(tmpPath('output'));

    await expect(unzip(tmpPath('path_traversal.zip'), tmpPath('output'))).resolves.toBeUndefined();
    expect(existsSync(tmpPath('output/escaped.txt'))).toEqual(true);
    expect(existsSync(tmpPath('escaped.txt'))).toEqual(false);
  });

  it('does not follow zip symlinks whose target lands outside the origin path', async () => {
    writeFileSync(tmpPath('symlink_escape.zip'), SYMLINK_ESCAPE_ZIP);
    mkdirSync(tmpPath('output'));

    await expect(unzip(tmpPath('symlink_escape.zip'), tmpPath('output'))).resolves.toBeUndefined();
    expect(existsSync(tmpPath('escaped.txt'))).toEqual(false);
    expect(existsSync(tmpPath('output/escaped.txt'))).toEqual(false);
    expect(existsSync(tmpPath('output/symlink_escape/escaped.txt'))).toEqual(false);

    expect(existsSync(tmpPath('output/symlink_escape/link'))).toEqual(true);
    expect((await lstat(tmpPath('output/symlink_escape/link'))).isSymbolicLink()).toEqual(false);
  });

  it('extracts zip entries whose symlink target stays inside the origin path', async () => {
    writeFileSync(tmpPath('symlink_ok.zip'), SYMLINK_OK_ZIP);
    mkdirSync(tmpPath('output'));

    await expect(unzip(tmpPath('symlink_ok.zip'), tmpPath('output'))).resolves.toBeUndefined();
    await expect(readFile(tmpPath('output/inside.txt'), 'utf8')).resolves.toEqual('ok');
  });
});
