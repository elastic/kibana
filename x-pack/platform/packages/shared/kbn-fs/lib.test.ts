/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs, existsSync, readFileSync as fsReadFileSync } from 'fs';
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

describe('kbn-fs', () => {
  beforeEach(async () => {
    try {
      await fs.rm(join(DATA_PATH, 'test'), { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('writeFile', () => {
    it('should write string content to a file', async () => {
      const content = 'Hello, World!';
      const result = await writeFile('test/hello.txt', content);

      expect(result.alias).toBe('disk:test/hello.txt');
      expect(result.path).toContain('test/hello.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should write Buffer content to a file', async () => {
      const content = Buffer.from('Hello, Buffer!');
      const result = await writeFile('test/buffer.txt', content);

      expect(result.alias).toBe('disk:test/buffer.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path)).toEqual(content);
    });

    it('should write Uint8Array content to a file', async () => {
      const content = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await writeFile('test/uint8.txt', content);

      expect(result.alias).toBe('disk:test/uint8.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path)).toEqual(Buffer.from(content));
    });

    it('should write content with volume option', async () => {
      const content = 'Volume test';
      const result = await writeFile('test.txt', content, { volume: 'reports' });

      expect(result.alias).toBe('disk:reports/test.txt');
      expect(result.path).toContain('reports/test.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should override existing file by default', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('test/override.txt', initialContent);
      const result = await writeFile('test/override.txt', newContent);

      expect(fsReadFileSync(result.path, 'utf8')).toBe(newContent);
    });

    it('should not override existing file when override is false', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('test/no-override.txt', initialContent);

      await expect(
        writeFile('test/no-override.txt', newContent, { override: false })
      ).rejects.toThrow(
        'File already exists: test/no-override.txt. Use override: true to replace it.'
      );
    });

    it('should allow override when explicitly set to true', async () => {
      const initialContent = 'Initial content';
      const newContent = 'New content';

      await writeFile('test/explicit-override.txt', initialContent);
      const result = await writeFile('test/explicit-override.txt', newContent, { override: true });

      expect(fsReadFileSync(result.path, 'utf8')).toBe(newContent);
    });

    it('should throw error for path traversal attempts', async () => {
      await expect(writeFile('../../../etc/passwd', 'malicious content')).rejects.toThrow(
        'Path traversal detected: ../../../etc/passwd'
      );
    });
  });

  describe('writeFileSync', () => {
    it('should write string content synchronously', () => {
      const content = 'Sync Hello, World!';
      const result = writeFileSync('test/sync-hello.txt', content);

      expect(result.alias).toBe('disk:test/sync-hello.txt');
      expect(result.path).toContain('test/sync-hello.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should write Buffer content synchronously', () => {
      const content = Buffer.from('Sync Buffer!');
      const result = writeFileSync('test/sync-buffer.txt', content);

      expect(result.alias).toBe('disk:test/sync-buffer.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path)).toEqual(content);
    });

    it('should write content with volume option', () => {
      const content = 'Sync Volume test';
      const result = writeFileSync('test.txt', content, { volume: 'exports' });

      expect(result.alias).toBe('disk:exports/test.txt');
      expect(result.path).toContain('exports/test.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should override existing file by default', () => {
      const initialContent = 'Initial sync content';
      const newContent = 'New sync content';

      writeFileSync('test/sync-override.txt', initialContent);
      const result = writeFileSync('test/sync-override.txt', newContent);

      expect(fsReadFileSync(result.path, 'utf8')).toBe(newContent);
    });

    it('should not override existing file when override is false', () => {
      const initialContent = 'Initial sync content';
      const newContent = 'New sync content';

      writeFileSync('test/sync-no-override.txt', initialContent);

      expect(() =>
        writeFileSync('test/sync-no-override.txt', newContent, { override: false })
      ).toThrow(
        'File already exists: test/sync-no-override.txt. Use override: true to replace it.'
      );
    });
  });

  describe('appendFile', () => {
    it('should append string content to existing file', async () => {
      const initialContent = 'Initial content\n';
      const appendContent = 'Appended content';

      await writeFile('test/append.txt', initialContent);
      const result = await appendFile('test/append.txt', appendContent);

      expect(result.alias).toBe('disk:test/append.txt');
      expect(fsReadFileSync(result.path, 'utf8')).toBe(initialContent + appendContent);
    });

    it('should create file if it does not exist', async () => {
      const content = 'New file content';
      const result = await appendFile('test/new-append.txt', content);

      expect(result.alias).toBe('disk:test/new-append.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should append Buffer content', async () => {
      const initialContent = Buffer.from('Initial buffer\n');
      const appendContent = Buffer.from('Appended buffer');

      await writeFile('test/append-buffer.txt', initialContent);
      const result = await appendFile('test/append-buffer.txt', appendContent);

      expect(fsReadFileSync(result.path)).toEqual(Buffer.concat([initialContent, appendContent]));
    });

    it('should append content with volume option', async () => {
      const initialContent = 'Initial volume content\n';
      const appendContent = 'Appended volume content';

      await writeFile('test.txt', initialContent, { volume: 'logs' });
      const result = await appendFile('test.txt', appendContent, { volume: 'logs' });

      expect(result.alias).toBe('disk:logs/test.txt');
      expect(fsReadFileSync(result.path, 'utf8')).toBe(initialContent + appendContent);
    });
  });

  describe('appendFileSync', () => {
    it('should append string content synchronously', () => {
      const initialContent = 'Initial sync content\n';
      const appendContent = 'Appended sync content';

      writeFileSync('test/sync-append.txt', initialContent);
      const result = appendFileSync('test/sync-append.txt', appendContent);

      expect(result.alias).toBe('disk:test/sync-append.txt');
      expect(fsReadFileSync(result.path, 'utf8')).toBe(initialContent + appendContent);
    });

    it('should create file if it does not exist', () => {
      const content = 'New sync file content';
      const result = appendFileSync('test/new-sync-append.txt', content);

      expect(result.alias).toBe('disk:test/new-sync-append.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should append Buffer content synchronously', () => {
      const initialContent = Buffer.from('Initial sync buffer\n');
      const appendContent = Buffer.from('Appended sync buffer');

      writeFileSync('test/sync-append-buffer.txt', initialContent);
      const result = appendFileSync('test/sync-append-buffer.txt', appendContent);

      expect(fsReadFileSync(result.path)).toEqual(Buffer.concat([initialContent, appendContent]));
    });
  });

  describe('readFile', () => {
    it('should read file content as Buffer by default', async () => {
      const content = 'Read test content';
      await writeFile('test/read.txt', content);

      const result = await readFile('test/read.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toBe(content);
    });

    it('should read file with volume option', async () => {
      const content = 'Read volume content';
      await writeFile('test.txt', content, { volume: 'data' });

      const result = await readFile('test.txt', 'data');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toBe(content);
    });

    it('should throw error if file does not exist', async () => {
      await expect(readFile('test/nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('readFileSync', () => {
    it('should read file content synchronously', () => {
      const content = 'Sync read test content';
      writeFileSync('test/sync-read.txt', content);

      const result = readFileSync('test/sync-read.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toBe(content);
    });

    it('should read file with volume option', () => {
      const content = 'Sync read volume content';
      writeFileSync('test.txt', content, { volume: 'cache' });

      const result = readFileSync('test.txt', 'cache');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toBe(content);
    });

    it('should throw error if file does not exist', () => {
      expect(() => readFileSync('test/nonexistent-sync.txt')).toThrow();
    });
  });

  describe('createWriteStream', () => {
    it('should create a writable stream', async () => {
      const content = 'Stream write test content';
      const stream = createWriteStream('test/stream-write.txt');

      await new Promise<void>((resolve, reject) => {
        stream.write(content, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      stream.end();

      await new Promise<void>((resolve) => {
        stream.on('close', resolve);
      });

      expect(existsSync(join(DATA_PATH, 'test/stream-write.txt'))).toBe(true);
      expect(fsReadFileSync(join(DATA_PATH, 'test/stream-write.txt'), 'utf8')).toBe(content);
    });

    it('should create a writable stream with volume', async () => {
      const content = 'Stream write volume content';
      const stream = createWriteStream('test.txt', 'uploads');

      await new Promise<void>((resolve, reject) => {
        stream.write(content, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      stream.end();

      await new Promise<void>((resolve) => {
        stream.on('close', resolve);
      });

      expect(existsSync(join(DATA_PATH, 'uploads/test.txt'))).toBe(true);
      expect(fsReadFileSync(join(DATA_PATH, 'uploads/test.txt'), 'utf8')).toBe(content);
    });

    it('should create a writable stream with options', async () => {
      const content = 'Stream write with options';
      const stream = createWriteStream('test/stream-options.txt', undefined, 'utf8');

      await new Promise<void>((resolve, reject) => {
        stream.write(content, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      stream.end();

      await new Promise<void>((resolve) => {
        stream.on('close', resolve);
      });

      expect(existsSync(join(DATA_PATH, 'test/stream-options.txt'))).toBe(true);
      expect(fsReadFileSync(join(DATA_PATH, 'test/stream-options.txt'), 'utf8')).toBe(content);
    });
  });

  describe('createReadStream', () => {
    it('should create a readable stream', async () => {
      const content = 'Stream read test content';
      await writeFile('test/stream-read.txt', content);

      const stream = createReadStream('test/stream-read.txt');
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const result = Buffer.concat(chunks).toString('utf8');
      expect(result).toBe(content);
    });

    it('should create a readable stream with volume', async () => {
      const content = 'Stream read volume content';
      await writeFile('test.txt', content, { volume: 'downloads' });

      const stream = createReadStream('test.txt', 'downloads');
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const result = Buffer.concat(chunks).toString('utf8');
      expect(result).toBe(content);
    });

    it('should create a readable stream with options', async () => {
      const content = 'Stream read with options';
      await writeFile('test/stream-read-options.txt', content);

      const stream = createReadStream('test/stream-read-options.txt', undefined, 'utf8');
      const chunks: string[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const result = chunks.join('');
      expect(result).toBe(content);
    });

    it('should throw error if file does not exist', () => {
      const stream = createReadStream('test/nonexistent-stream.txt');

      return new Promise<void>((resolve, reject) => {
        stream.on('error', (err: any) => {
          expect(err.code).toBe('ENOENT');
          resolve();
        });
        stream.on('data', () => {
          reject(new Error('Should not receive data'));
        });
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      await writeFile('test/delete.txt', 'Content to delete');
      const filePath = join(DATA_PATH, 'test/delete.txt');

      expect(existsSync(filePath)).toBe(true);

      await deleteFile('test/delete.txt');

      expect(existsSync(filePath)).toBe(false);
    });

    it('should delete file with volume option', async () => {
      await writeFile('test.txt', 'Content to delete', { volume: 'temp' });
      const filePath = join(DATA_PATH, 'temp/test.txt');

      expect(existsSync(filePath)).toBe(true);

      await deleteFile('test.txt', { volume: 'temp' });

      expect(existsSync(filePath)).toBe(false);
    });

    it('should throw error if file does not exist', async () => {
      await expect(deleteFile('test/nonexistent-delete.txt')).rejects.toThrow();
    });
  });

  describe('deleteFileSync', () => {
    it('should delete an existing file synchronously', () => {
      writeFileSync('test/sync-delete.txt', 'Content to delete');
      const filePath = join(DATA_PATH, 'test/sync-delete.txt');

      expect(existsSync(filePath)).toBe(true);

      deleteFileSync('test/sync-delete.txt');

      expect(existsSync(filePath)).toBe(false);
    });

    it('should delete file with volume option', () => {
      writeFileSync('test.txt', 'Content to delete', { volume: 'temp' });
      const filePath = join(DATA_PATH, 'temp/test.txt');

      expect(existsSync(filePath)).toBe(true);

      deleteFileSync('test.txt', { volume: 'temp' });

      expect(existsSync(filePath)).toBe(false);
    });

    it('should throw error if file does not exist', () => {
      expect(() => deleteFileSync('test/nonexistent-sync-delete.txt')).toThrow();
    });
  });

  describe('WriteFileContent types', () => {
    it('should handle Iterable content', async () => {
      const content = ['Hello', ' ', 'World', '!'];
      const result = await writeFile('test/iterable.txt', content);

      expect(result.alias).toBe('disk:test/iterable.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe('Hello World!');
    });

    it('should handle AsyncIterable content', async () => {
      async function* asyncContent() {
        yield 'Async';
        yield ' ';
        yield 'Content';
      }

      const result = await writeFile('test/async-iterable.txt', asyncContent());

      expect(result.alias).toBe('disk:test/async-iterable.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe('Async Content');
    });

    it('should handle Stream content', async () => {
      const content = 'Stream content test';
      const readable = Readable.from([content]);

      const result = await writeFile('test/stream-content.txt', readable);

      expect(result.alias).toBe('disk:test/stream-content.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty string content', async () => {
      const result = await writeFile('test/empty.txt', '');

      expect(result.alias).toBe('disk:test/empty.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe('');
    });

    it('should handle empty Buffer content', async () => {
      const result = await writeFile('test/empty-buffer.txt', Buffer.alloc(0));

      expect(result.alias).toBe('disk:test/empty-buffer.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path)).toEqual(Buffer.alloc(0));
    });

    it('should handle special characters in file names', async () => {
      const content = 'Special chars test';
      const result = await writeFile('test/file-with-special-chars.txt', content);

      expect(result.alias).toBe('disk:test/file-with-special-chars.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should handle very long file names', async () => {
      const longName = 'a'.repeat(100) + '.txt';
      const content = 'Long name test';
      const result = await writeFile(`test/${longName}`, content);

      expect(result.alias).toBe(`disk:test/${longName}`);
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should handle nested directory creation', async () => {
      const content = 'Nested directory test';
      const result = await writeFile('test/nested/deep/directory/file.txt', content);

      expect(result.alias).toBe('disk:test/nested/deep/directory/file.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });

    it('should handle volume with nested paths', async () => {
      const content = 'Nested volume test';
      const result = await writeFile('file.txt', content, { volume: 'reports/2024/january' });

      expect(result.alias).toBe('disk:reports/2024/january/file.txt');
      expect(result.path).toContain('reports/2024/january/file.txt');
      expect(existsSync(result.path)).toBe(true);
      expect(fsReadFileSync(result.path, 'utf8')).toBe(content);
    });
  });
});
