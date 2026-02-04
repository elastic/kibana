/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFileEntry } from '../../../test_utils/filestore';
import { FileSystemStore } from './store';
import { VirtualFileSystem, MemoryVolume } from './filesystem';

describe('FileSystemStore', () => {
  let vfs: VirtualFileSystem;
  let volume: MemoryVolume;
  let store: FileSystemStore;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    volume = new MemoryVolume('test');
    vfs.mount(volume);
    store = new FileSystemStore({ filesystem: vfs });
  });

  afterEach(async () => {
    await vfs.dispose();
  });

  describe('read', () => {
    it('returns a file entry when path exists', async () => {
      const entry = createFileEntry('/files/test.json', { content: { raw: { data: 'test' } } });
      volume.add(entry);

      const result = await store.read('/files/test.json');

      expect(result?.path).toBe(entry.path);
      expect(result?.content.raw).toEqual({ data: 'test' });
      expect(result?.metadata.token_count).toBe(100);
    });

    it('returns latest version by default', async () => {
      const entry = createFileEntry('/files/test.json', {
        overrides: {
          versions: [
            {
              version: 2,
              content: { raw: { data: 'v2' } },
              metadata: { token_count: 100 },
            },
            {
              version: 1,
              content: { raw: { data: 'v1' } },
              metadata: { token_count: 100 },
            },
          ],
        },
      });
      volume.add(entry);

      const result = await store.read('/files/test.json');

      expect(result?.content.raw).toEqual({ data: 'v2' });
      expect(result?.metadata.token_count).toBe(100);
    });

    it('returns requested version when specified', async () => {
      const entry = createFileEntry('/files/test.json', {
        overrides: {
          versions: [
            {
              version: 1,
              content: { raw: { data: 'v1' } },
              metadata: { token_count: 100 },
            },
            {
              version: 2,
              content: { raw: { data: 'v2' } },
              metadata: { token_count: 100 },
            },
          ],
        },
      });
      volume.add(entry);

      const result = await store.read('/files/test.json', { version: 1 });

      expect(result?.content.raw).toEqual({ data: 'v1' });
      expect(result?.metadata.token_count).toBe(100);
    });

    it('returns undefined when path does not exist', async () => {
      const result = await store.read('/files/nonexistent.json');

      expect(result).toBeUndefined();
    });

    it('returns undefined when path is a directory', async () => {
      volume.add(createFileEntry('/files/test.json', { content: { raw: { data: 'test' } } }));

      const result = await store.read('/files');

      expect(result).toBeUndefined();
    });
  });

  describe('ls', () => {
    describe('with depth=1 (default)', () => {
      it('lists immediate children of a directory', async () => {
        volume.add(createFileEntry('/root/file1.json', { content: { raw: { id: 1 } } }));
        volume.add(createFileEntry('/root/file2.json', { content: { raw: { id: 2 } } }));

        const result = await store.ls('/root');

        expect(result).toHaveLength(2);
        expect(result.map((e) => e.path)).toEqual(
          expect.arrayContaining(['/root/file1.json', '/root/file2.json'])
        );
      });

      it('includes subdirectories as DirEntry', async () => {
        volume.add(createFileEntry('/root/subdir/file.json', { content: { raw: {} } }));

        const result = await store.ls('/root');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ path: '/root/subdir', type: 'dir' });
      });

      it('returns empty array for empty directory', async () => {
        const result = await store.ls('/nonexistent');

        expect(result).toEqual([]);
      });
    });

    describe('with depth > 1 (nested tree)', () => {
      it('returns nested tree structure with depth=2', async () => {
        volume.add(createFileEntry('/root/file1.json', { content: { raw: { id: 1 } } }));
        volume.add(createFileEntry('/root/subdir/file2.json', { content: { raw: { id: 2 } } }));

        const result = await store.ls('/root', { depth: 2 });

        expect(result).toHaveLength(2);

        // Find the file and directory
        const file1 = result.find((e) => e.path === '/root/file1.json');
        const subdir = result.find((e) => e.path === '/root/subdir');

        expect(file1).toBeDefined();
        expect(file1?.type).toBe('file');

        expect(subdir).toBeDefined();
        expect(subdir?.type).toBe('dir');
        expect((subdir as any).children).toHaveLength(1);
        expect((subdir as any).children[0].path).toBe('/root/subdir/file2.json');
      });

      it('returns deeply nested tree with depth=3', async () => {
        volume.add(createFileEntry('/root/a/b/file.json', { content: { raw: {} } }));

        const result = await store.ls('/root', { depth: 3 });

        expect(result).toHaveLength(1);
        const dirA = result[0] as any;
        expect(dirA.path).toBe('/root/a');
        expect(dirA.children).toHaveLength(1);

        const dirB = dirA.children[0];
        expect(dirB.path).toBe('/root/a/b');
        expect(dirB.children).toHaveLength(1);

        const file = dirB.children[0];
        expect(file.path).toBe('/root/a/b/file.json');
        expect(file.type).toBe('file');
      });
    });
  });

  describe('glob', () => {
    it('returns files matching glob pattern', async () => {
      volume.add(createFileEntry('/files/test1.json', { content: { raw: { id: 1 } } }));
      volume.add(createFileEntry('/files/test2.json', { content: { raw: { id: 2 } } }));
      volume.add(createFileEntry('/files/test.txt', { content: { raw: { id: 3 } } }));

      const result = await store.glob('/files/*.json');

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.path)).toEqual(
        expect.arrayContaining(['/files/test1.json', '/files/test2.json'])
      );
      expect(result[0].content).toBeDefined();
    });

    it('returns only files, not directories', async () => {
      volume.add(createFileEntry('/files/subdir/file.json', { content: { raw: {} } }));

      const result = await store.glob('/files/*');

      // Should not include /files/subdir directory
      expect(result).toHaveLength(0);
    });

    it('supports ** for recursive matching', async () => {
      volume.add(createFileEntry('/files/a.json', { content: { raw: {} } }));
      volume.add(createFileEntry('/files/sub/b.json', { content: { raw: {} } }));
      volume.add(createFileEntry('/files/sub/deep/c.json', { content: { raw: {} } }));

      const result = await store.glob('/files/**/*.json');

      expect(result).toHaveLength(3);
    });

    it('returns empty array when no matches', async () => {
      volume.add(createFileEntry('/files/test.txt', { content: { raw: {} } }));

      const result = await store.glob('/files/*.json');

      expect(result).toEqual([]);
    });
  });

  describe('getEntry', () => {
    it('returns raw entry with versions', async () => {
      volume.add(
        createFileEntry('/files/test.json', {
          overrides: {
            versions: [
              {
                version: 1,
                content: { raw: { id: 1 } },
                metadata: { token_count: 100, version_change: 'initial' },
              },
              {
                version: 2,
                content: { raw: { id: 2 } },
                metadata: { token_count: 100, version_change: 'updated id' },
              },
            ],
          },
        })
      );

      const result = await store.getEntry('/files/test.json');

      expect(result?.versions).toHaveLength(2);
      expect(result?.versions[0].metadata.version_change).toBe('initial');
      expect(result?.versions[1].metadata.version_change).toBe('updated id');
    });

    it('returns undefined for missing files', async () => {
      const result = await store.getEntry('/files/missing.json');

      expect(result).toBeUndefined();
    });
  });

  describe('grep', () => {
    it('uses latest version content when searching', async () => {
      const entry = createFileEntry('/files/test.json', {
        overrides: {
          versions: [
            {
              version: 1,
              content: { raw: {}, plain_text: 'old content' },
              metadata: { token_count: 100 },
            },
            {
              version: 2,
              content: { raw: {}, plain_text: 'new content' },
              metadata: { token_count: 100 },
            },
          ],
        },
      });
      volume.add(entry);

      const result = await store.grep('new content', '/files/*.json');

      expect(result).toHaveLength(1);
      expect(result[0].line).toBe(1);
    });

    describe('regex mode (default)', () => {
      it('finds matches using regex pattern', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'line 1\nfoo bar\nline 3' },
          })
        );

        const result = await store.grep('foo.*bar', '/files/*.json');

        expect(result).toHaveLength(1);
        expect(result[0].line).toBe(2);
        expect(result[0].match).toBe('foo bar');
      });

      it('finds multiple matches in the same file', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'error: first\ninfo: ok\nerror: second' },
          })
        );

        const result = await store.grep('^error:', '/files/*.json');

        expect(result).toHaveLength(2);
        expect(result[0].line).toBe(1);
        expect(result[1].line).toBe(3);
      });

      it('finds matches across multiple files', async () => {
        volume.add(
          createFileEntry('/files/a.json', {
            content: { raw: {}, plain_text: 'hello world' },
          })
        );
        volume.add(
          createFileEntry('/files/b.json', {
            content: { raw: {}, plain_text: 'goodbye world' },
          })
        );

        const result = await store.grep('world', '/files/*.json');

        expect(result).toHaveLength(2);
        expect(result.map((m) => m.entry.path)).toEqual(
          expect.arrayContaining(['/files/a.json', '/files/b.json'])
        );
      });
    });

    describe('fixed mode (literal text)', () => {
      it('treats pattern as literal text', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'foo.*bar\nfoo test bar' },
          })
        );

        const result = await store.grep('foo.*bar', '/files/*.json', { fixed: true });

        expect(result).toHaveLength(1);
        expect(result[0].line).toBe(1);
        expect(result[0].match).toBe('foo.*bar');
      });

      it('does not interpret regex metacharacters', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'function test() {\n  return true;\n}' },
          })
        );

        const result = await store.grep('test()', '/files/*.json', { fixed: true });

        expect(result).toHaveLength(1);
        expect(result[0].line).toBe(1);
      });
    });

    describe('context option', () => {
      it('includes context lines before and after match', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'line 1\nline 2\nmatch here\nline 4\nline 5' },
          })
        );

        const result = await store.grep('match', '/files/*.json', { context: 1 });

        expect(result).toHaveLength(1);
        expect(result[0].match).toBe('line 2\nmatch here\nline 4');
      });

      it('handles context at beginning of file', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'match here\nline 2\nline 3' },
          })
        );

        const result = await store.grep('match', '/files/*.json', { context: 2 });

        expect(result).toHaveLength(1);
        expect(result[0].match).toBe('match here\nline 2\nline 3');
      });

      it('handles context at end of file', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: {}, plain_text: 'line 1\nline 2\nmatch here' },
          })
        );

        const result = await store.grep('match', '/files/*.json', { context: 2 });

        expect(result).toHaveLength(1);
        expect(result[0].match).toBe('line 1\nline 2\nmatch here');
      });
    });

    describe('content fallback', () => {
      it('uses plain_text when available', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: { nested: { value: 'hidden' } }, plain_text: 'searchable text' },
          })
        );

        const result = await store.grep('searchable', '/files/*.json');

        expect(result).toHaveLength(1);
      });

      it('falls back to JSON stringified raw content when plain_text is not available', async () => {
        volume.add(
          createFileEntry('/files/test.json', {
            content: { raw: { key: 'findme' } },
          })
        );

        const result = await store.grep('findme', '/files/*.json');

        expect(result).toHaveLength(1);
      });
    });

    it('returns empty array when no matches', async () => {
      volume.add(
        createFileEntry('/files/test.json', {
          content: { raw: {}, plain_text: 'no match here' },
        })
      );

      const result = await store.grep('nonexistent', '/files/*.json');

      expect(result).toEqual([]);
    });

    it('returns empty array when no files match glob', async () => {
      volume.add(
        createFileEntry('/other/test.json', {
          content: { raw: {}, plain_text: 'findme' },
        })
      );

      const result = await store.grep('findme', '/files/*.json');

      expect(result).toEqual([]);
    });
  });
});
