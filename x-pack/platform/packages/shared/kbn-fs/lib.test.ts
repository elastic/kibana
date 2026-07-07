/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { Readable } from 'stream';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  writeFile,
  writeFileSync,
  appendFile,
  appendFileSync,
  createWriteStream,
  readFile,
  readFileSync,
  createReadStream,
  deleteFile,
  deleteFileSync,
} from './lib';

const DATA_PATH = join(REPO_ROOT, 'data');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: jest.fn(),
      appendFile: jest.fn(),
      readFile: jest.fn(),
      unlink: jest.fn(),
      mkdir: jest.fn(),
      rm: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn().mockImplementation((path: string) => {
      if (path.includes('package.json')) {
        return JSON.stringify({ name: 'kibana' });
      }
    }),
    writeFileSync: jest.fn(),
    appendFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
    createWriteStream: jest.fn(),
    createReadStream: jest.fn(),
  };
});

import fs from 'fs';

describe('kbn-fs', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('writeFile', () => {
    it('should write string content to a file', async () => {
      const content = 'Hello, World!';
      const result = await writeFile('hello.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/hello.txt');
      expect(result.path).toContain('test/hello.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/hello.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should write Buffer content to a file', async () => {
      const content = Buffer.from('Hello, Buffer!');
      const result = await writeFile('buffer.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/buffer.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/buffer.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should write Uint8Array content to a file', async () => {
      const content = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await writeFile('uint8.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/uint8.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/uint8.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should write content with volume option', async () => {
      const content = 'Volume test';
      const result = await writeFile('test.txt', content, { volume: 'reports' });

      expect(result.alias).toBe('disk:data/reports/test.txt');
      expect(result.path).toContain('reports/test.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'reports/test.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should override existing file by default', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('override.txt', initialContent, { volume: 'test' });
      const result = await writeFile('override.txt', newContent, { volume: 'test' });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.promises.writeFile).toHaveBeenLastCalledWith(result.path, expect.any(Buffer));
    });

    it('should not override existing file when override is false', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('no-override.txt', initialContent, { volume: 'test' });

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await expect(
        writeFile('no-override.txt', newContent, { override: false, volume: 'test' })
      ).rejects.toThrow('File already exists: no-override.txt. Use override: true to replace it.');

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should allow override when explicitly set to true', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('explicit-override.txt', initialContent, { volume: 'test' });
      const result = await writeFile('explicit-override.txt', newContent, {
        override: true,
        volume: 'test',
      });

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.promises.writeFile).toHaveBeenLastCalledWith(result.path, expect.any(Buffer));
    });

    it('should throw error for path traversal attempts', async () => {
      await expect(writeFile('../../../etc/passwd', 'malicious content')).rejects.toThrow();
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('writeFileSync', () => {
    it('should write string content synchronously', () => {
      const content = 'Sync Hello, World!';
      const result = writeFileSync('sync-hello.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/sync-hello.txt');
      expect(result.path).toContain('test/sync-hello.txt');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/sync-hello.txt'),
        expect.any(Buffer)
      );
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should write Buffer content synchronously', () => {
      const content = Buffer.from('Sync Buffer!');
      const result = writeFileSync('sync-buffer.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/sync-buffer.txt');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/sync-buffer.txt'),
        expect.any(Buffer)
      );
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should write content with volume option', () => {
      const content = 'Sync Volume test';
      const result = writeFileSync('test.txt', content, { volume: 'exports' });

      expect(result.alias).toBe('disk:data/exports/test.txt');
      expect(result.path).toContain('exports/test.txt');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'exports/test.txt'),
        expect.any(Buffer)
      );
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should override existing file by default', () => {
      const initialContent = 'Initial sync content';
      const newContent = 'New sync content';

      writeFileSync('sync-override.txt', initialContent, { volume: 'test' });
      const result = writeFileSync('sync-override.txt', newContent, { volume: 'test' });

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenLastCalledWith(result.path, expect.any(Buffer));
    });

    it('should not override existing file when override is false', () => {
      const initialContent = 'Initial sync content';
      const newContent = 'New sync content';

      writeFileSync('sync-no-override.txt', initialContent, { volume: 'test' });

      expect(() =>
        writeFileSync('sync-no-override.txt', newContent, { override: false, volume: 'test' })
      ).toThrow('File already exists: sync-no-override.txt. Use override: true to replace it.');

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('appendFile', () => {
    it('should append string content to existing file', async () => {
      const initialContent = 'Initial content\n';
      const appendContent = 'Appended content';

      await writeFile('append.txt', initialContent, { volume: 'test' });
      const result = await appendFile('append.txt', appendContent, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/append.txt');
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/append.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should create file if it does not exist', async () => {
      const content = 'New file content';
      const result = await appendFile('new-append.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/new-append.txt');
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/new-append.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should append Buffer content', async () => {
      const initialContent = Buffer.from('Initial buffer\n');
      const appendContent = Buffer.from('Appended buffer');

      await writeFile('append-buffer.txt', initialContent, { volume: 'test' });
      await appendFile('append-buffer.txt', appendContent, { volume: 'test' });

      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/append-buffer.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should append content with volume option', async () => {
      const initialContent = 'Initial volume content\n';
      const appendContent = 'Appended volume content';

      await writeFile('test.txt', initialContent, { volume: 'logs' });
      const result = await appendFile('test.txt', appendContent, { volume: 'logs' });

      expect(result.alias).toBe('disk:data/logs/test.txt');
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'logs/test.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.appendFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('appendFileSync', () => {
    it('should append string content synchronously', () => {
      const initialContent = 'Initial sync content\n';
      const appendContent = 'Appended sync content';

      writeFileSync('sync-append.txt', initialContent, { volume: 'test' });
      const result = appendFileSync('sync-append.txt', appendContent, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/sync-append.txt');
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/sync-append.txt'),
        expect.any(Buffer)
      );
      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    });

    it('should create file if it does not exist', () => {
      const content = 'New sync file content';
      const result = appendFileSync('new-sync-append.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/new-sync-append.txt');
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/new-sync-append.txt'),
        expect.any(Buffer)
      );
      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    });

    it('should append Buffer content synchronously', () => {
      const initialContent = Buffer.from('Initial sync buffer\n');
      const appendContent = Buffer.from('Appended sync buffer');

      writeFileSync('sync-append-buffer.txt', initialContent, { volume: 'test' });
      appendFileSync('sync-append-buffer.txt', appendContent, {
        volume: 'test',
      });

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/sync-append-buffer.txt'),
        expect.any(Buffer)
      );
      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('readFile', () => {
    it('should read file content as Buffer by default', async () => {
      const content = 'Read test content';
      await writeFile('test/read.txt', content);

      await readFile('test/read.txt');

      expect(fs.promises.readFile).toHaveBeenCalledWith(join(DATA_PATH, 'test/read.txt'));
      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });

    it('should read file with volume option', async () => {
      const content = 'Read volume content';
      await writeFile('test.txt', content, { volume: 'data' });

      await readFile('test.txt', 'data');

      expect(fs.promises.readFile).toHaveBeenCalledWith(join(DATA_PATH, 'data/test.txt'));
      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('readFileSync', () => {
    it('should read file content synchronously', () => {
      const content = 'Sync read test content';
      writeFileSync('test/sync-read.txt', content);

      readFileSync('test/sync-read.txt');

      expect(fs.readFileSync).toHaveBeenCalledWith(join(DATA_PATH, 'test/sync-read.txt'));
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should read file with volume option', () => {
      const content = 'Sync read volume content';
      writeFileSync('test.txt', content, { volume: 'cache' });

      readFileSync('test.txt', 'cache');

      expect(fs.readFileSync).toHaveBeenCalledWith(join(DATA_PATH, 'cache/test.txt'));
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('createWriteStream', () => {
    it('should create a writable stream', async () => {
      createWriteStream('stream-write.txt');

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'stream-write.txt'),
        undefined
      );
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });

    it('should create a writable stream with volume', async () => {
      createWriteStream('test.txt', 'test/uploads');

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/uploads/test.txt'),
        undefined
      );
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });

    it('should create a writable stream with options', async () => {
      createWriteStream('stream-options.txt', 'test', 'utf8');

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/stream-options.txt'),
        'utf8'
      );
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('createReadStream', () => {
    it('should create a readable stream', async () => {
      createReadStream('stream-read.txt', 'test');

      expect(fs.createReadStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/stream-read.txt'),
        undefined
      );
      expect(fs.createReadStream).toHaveBeenCalledTimes(1);
    });

    it('should create a readable stream with volume', async () => {
      const content = 'Stream read volume content';
      await writeFile('test.txt', content, { volume: 'downloads' });

      createReadStream('test.txt', 'downloads');

      expect(fs.createReadStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'downloads/test.txt'),
        undefined
      );
      expect(fs.createReadStream).toHaveBeenCalledTimes(1);
    });

    it('should create a readable stream with options', async () => {
      const content = 'Stream read with options';
      await writeFile('test/stream-read-options.txt', content);

      createReadStream('test/stream-read-options.txt', undefined, 'utf8');

      expect(fs.createReadStream).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/stream-read-options.txt'),
        'utf8'
      );
      expect(fs.createReadStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      await writeFile('delete.txt', 'Content to delete', { volume: 'test' });

      await deleteFile('delete.txt', { volume: 'test' });

      expect(fs.promises.unlink).toHaveBeenCalledWith(join(DATA_PATH, 'test/delete.txt'));
      expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
    });

    it('should delete file with volume option', async () => {
      await writeFile('test.txt', 'Content to delete', { volume: 'temp' });

      await deleteFile('test.txt', { volume: 'temp' });

      expect(fs.promises.unlink).toHaveBeenCalledWith(join(DATA_PATH, 'temp/test.txt'));
      expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteFileSync', () => {
    it('should delete an existing file synchronously', () => {
      writeFileSync('sync-delete.txt', 'Content to delete', { volume: 'test' });

      deleteFileSync('sync-delete.txt', { volume: 'test' });

      expect(fs.unlinkSync).toHaveBeenCalledWith(join(DATA_PATH, 'test/sync-delete.txt'));
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('should delete file with volume option', () => {
      writeFileSync('test.txt', 'Content to delete', { volume: 'temp' });

      deleteFileSync('test.txt', { volume: 'temp' });

      expect(fs.unlinkSync).toHaveBeenCalledWith(join(DATA_PATH, 'temp/test.txt'));
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('WriteFileContent types', () => {
    it('should handle Iterable content', async () => {
      const content = ['Hello', ' ', 'World', '!'];
      const result = await writeFile('iterable.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/iterable.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/iterable.txt'),
        expect.any(Buffer)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should handle AsyncIterable content', async () => {
      async function* asyncContent() {
        yield 'Async';
        yield ' ';
        yield 'Content';
      }

      const content = asyncContent();
      const result = await writeFile('async-iterable.txt', content, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/async-iterable.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      // AsyncIterable is passed as-is, not converted to Buffer
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/async-iterable.txt'),
        content
      );
    });

    it('should handle Stream content', async () => {
      const content = 'Stream content test';
      const readable = Readable.from([content]);

      const result = await writeFile('stream-content.txt', readable, { volume: 'test' });

      expect(result.alias).toBe('disk:data/test/stream-content.txt');
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      // Stream is passed as-is, not converted to Buffer
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        join(DATA_PATH, 'test/stream-content.txt'),
        readable
      );
    });
  });
});
