/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { openZipArchive, ZipArchive } from './zip_archive';

const ZIP_PATH = Path.resolve(__dirname, './test_data/test_archive_1.zip');

describe('ZipArchive', () => {
  let archive: ZipArchive;

  beforeAll(async () => {
    archive = await openZipArchive(ZIP_PATH);
  });

  afterAll(() => {
    archive?.close();
  });

  test('#getEntryPaths returns the path of all entries', () => {
    expect(archive.getEntryPaths().sort()).toEqual([
      'nested/',
      'nested/nested_1.txt',
      'text_1.txt',
      'text_2.txt',
      'text_3.txt',
    ]);
  });

  test('#hasEntry returns true if the entry exists, false otherwise', () => {
    expect(archive.hasEntry('nested/nested_1.txt')).toBe(true);
    expect(archive.hasEntry('not_an_entry')).toBe(false);
  });

  test('#getEntryContent returns the content of the entry', async () => {
    const buffer = await archive.getEntryContent('text_1.txt');
    expect(buffer.toString('utf-8')).toEqual('text_1');
  });
});
