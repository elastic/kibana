/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import yazl from 'yazl';
import { openZipArchive, type ZipArchive } from './open_zip_archive';

const createTestZip = async (files: Record<string, string>, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const zipFile = new yazl.ZipFile();
    for (const [filePath, content] of Object.entries(files)) {
      zipFile.addBuffer(Buffer.from(content, 'utf-8'), filePath);
    }
    zipFile.end();

    const chunks: Buffer[] = [];
    zipFile.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    zipFile.outputStream.on('end', async () => {
      try {
        await fs.writeFile(destPath, Buffer.concat(chunks));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    zipFile.outputStream.on('error', reject);
  });
};

describe('openZipArchive', () => {
  let tmpDir: string;
  let archive: ZipArchive | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zip-archive-test-'));
  });

  afterEach(async () => {
    archive?.close();
    archive = undefined;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('lists all entry paths', async () => {
    const zipPath = path.join(tmpDir, 'test.zip');
    await createTestZip(
      {
        'file-a.txt': 'content a',
        'dir/file-b.txt': 'content b',
      },
      zipPath
    );

    archive = await openZipArchive(zipPath);

    expect(archive.getEntryPaths().sort()).toEqual(['dir/file-b.txt', 'file-a.txt']);
  });

  it('reports whether an entry exists via hasEntry', async () => {
    const zipPath = path.join(tmpDir, 'test.zip');
    await createTestZip({ 'exists.txt': 'yes' }, zipPath);

    archive = await openZipArchive(zipPath);

    expect(archive.hasEntry('exists.txt')).toBe(true);
    expect(archive.hasEntry('missing.txt')).toBe(false);
  });

  it('reads entry content as a Buffer', async () => {
    const zipPath = path.join(tmpDir, 'test.zip');
    await createTestZip({ 'hello.txt': 'Hello, world!' }, zipPath);

    archive = await openZipArchive(zipPath);

    const content = await archive.getEntryContent('hello.txt');
    expect(Buffer.isBuffer(content)).toBe(true);
    expect(content.toString('utf-8')).toBe('Hello, world!');
  });

  it('preserves content byte-for-byte', async () => {
    const zipPath = path.join(tmpDir, 'test.zip');
    const originalContent = 'line 1\nline 2\nline 3';
    await createTestZip({ 'multi-line.txt': originalContent }, zipPath);

    archive = await openZipArchive(zipPath);

    const content = await archive.getEntryContent('multi-line.txt');
    expect(content.toString('utf-8')).toBe(originalContent);
    expect(content.length).toBe(Buffer.byteLength(originalContent, 'utf-8'));
  });

  it('throws when reading a non-existent entry', async () => {
    const zipPath = path.join(tmpDir, 'test.zip');
    await createTestZip({ 'a.txt': 'a' }, zipPath);

    archive = await openZipArchive(zipPath);

    expect(() => archive!.getEntryContent('does-not-exist.txt')).toThrow(/not found in archive/);
  });

  it('rejects when the zip file does not exist', async () => {
    const zipPath = path.join(tmpDir, 'nonexistent.zip');

    await expect(openZipArchive(zipPath)).rejects.toThrow();
  });

  it('rejects when the file is not a valid zip', async () => {
    const zipPath = path.join(tmpDir, 'not-a-zip.zip');
    await fs.writeFile(zipPath, 'this is not a zip file');

    await expect(openZipArchive(zipPath)).rejects.toThrow();
  });

  it('handles an empty zip archive', async () => {
    const zipPath = path.join(tmpDir, 'empty.zip');
    await createTestZip({}, zipPath);

    archive = await openZipArchive(zipPath);

    expect(archive.getEntryPaths()).toEqual([]);
    expect(archive.hasEntry('anything')).toBe(false);
  });

  it('handles entries with nested directory paths', async () => {
    const zipPath = path.join(tmpDir, 'nested.zip');
    await createTestZip(
      {
        'a/b/c/deep.txt': 'deep content',
        'a/b/sibling.txt': 'sibling content',
      },
      zipPath
    );

    archive = await openZipArchive(zipPath);

    expect(archive.hasEntry('a/b/c/deep.txt')).toBe(true);
    expect(archive.hasEntry('a/b/sibling.txt')).toBe(true);

    const deep = await archive.getEntryContent('a/b/c/deep.txt');
    expect(deep.toString('utf-8')).toBe('deep content');

    const sibling = await archive.getEntryContent('a/b/sibling.txt');
    expect(sibling.toString('utf-8')).toBe('sibling content');
  });

  it('can read multiple entries from the same archive', async () => {
    const zipPath = path.join(tmpDir, 'multi.zip');
    await createTestZip(
      {
        'first.txt': 'first',
        'second.txt': 'second',
        'third.txt': 'third',
      },
      zipPath
    );

    archive = await openZipArchive(zipPath);

    const first = await archive.getEntryContent('first.txt');
    const second = await archive.getEntryContent('second.txt');
    const third = await archive.getEntryContent('third.txt');

    expect(first.toString('utf-8')).toBe('first');
    expect(second.toString('utf-8')).toBe('second');
    expect(third.toString('utf-8')).toBe('third');
  });
});
