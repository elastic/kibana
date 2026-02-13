/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileEntryType, type FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import { MemoryVolume } from './memory_volume';
import { VirtualFileSystem } from './virtual_filesystem';

const createFileEntry = (
  path: string,
  content: FileEntry['content']['raw'] = { name: `content for ${path}` },
  overrides: Partial<FileEntry> = {}
): FileEntry => ({
  path,
  type: 'file',
  metadata: {
    type: FileEntryType.toolResult,
    id: path,
    token_count: 100,
    readonly: true,
  },
  content: { raw: content },
  ...overrides,
});

describe('VirtualFileSystem', () => {
  describe('mount', () => {
    it('mounts a volume', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));

      vfs.mount(volume);

      expect(await vfs.exists('/agents/agent1.json')).toBe(true);
    });

    it('returns unmount function', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));

      const unmount = vfs.mount(volume);
      await unmount();

      expect(await vfs.exists('/agents/agent1.json')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns file entry from volume', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      const entry = createFileEntry('/agents/agent1.json');
      volume.add(entry);
      vfs.mount(volume);

      const result = await vfs.get('/agents/agent1.json');

      expect(result).toEqual(entry);
    });

    it('returns DirEntry for implicit directories', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      vfs.mount(volume);

      const result = await vfs.get('/agents');

      expect(result).toEqual({ path: '/agents', type: 'dir' });
    });

    it('returns undefined for non-existing paths', async () => {
      const vfs = new VirtualFileSystem();

      const result = await vfs.get('/agents/agent1.json');

      expect(result).toBeUndefined();
    });

    it('uses first-wins for files across volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      volume1.add(createFileEntry('/shared/file.json', { source: 'v1' }));
      volume2.add(createFileEntry('/shared/file.json', { source: 'v2' }));

      vfs.mount(volume1);
      vfs.mount(volume2);

      const result = (await vfs.get('/shared/file.json')) as FileEntry;
      expect(result.content.raw).toEqual({ source: 'v1' });
    });

    it('respects priority for file resolution', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      volume1.add(createFileEntry('/shared/file.json', { source: 'v1' }));
      volume2.add(createFileEntry('/shared/file.json', { source: 'v2' }));

      // Mount v1 first but with lower priority (higher number)
      vfs.mount(volume1, { priority: 10 });
      vfs.mount(volume2, { priority: 1 });

      const result = (await vfs.get('/shared/file.json')) as FileEntry;
      expect(result.content.raw).toEqual({ source: 'v2' }); // v2 has higher priority (lower number)
    });
  });

  describe('list', () => {
    it('lists entries from a single volume', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      const entry1 = createFileEntry('/agents/agent1.json');
      const entry2 = createFileEntry('/agents/agent2.json');
      volume.add(entry1);
      volume.add(entry2);
      vfs.mount(volume);

      const results = await vfs.list('/agents');

      expect(results).toHaveLength(2);
      expect(results).toEqual(expect.arrayContaining([entry1, entry2]));
    });

    it('merges directories across volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      volume1.add(createFileEntry('/results/esql/query1.json'));
      volume2.add(createFileEntry('/results/alerts/alert1.json'));

      vfs.mount(volume1);
      vfs.mount(volume2);

      const results = await vfs.list('/results');

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          { path: '/results/esql', type: 'dir' },
          { path: '/results/alerts', type: 'dir' },
        ])
      );
    });

    it('uses first-wins for files across volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      const entry1 = createFileEntry('/agents/agent1.json', { source: 'v1' });
      const entry2 = createFileEntry('/agents/agent1.json', { source: 'v2' });

      volume1.add(entry1);
      volume2.add(entry2);

      vfs.mount(volume1);
      vfs.mount(volume2);

      const results = await vfs.list('/agents');

      expect(results).toHaveLength(1);
      expect((results[0] as FileEntry).content.raw).toEqual({ source: 'v1' });
    });

    it('supports recursive listing', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      volume.add(createFileEntry('/agents/custom/agent2.json'));
      vfs.mount(volume);

      const results = await vfs.list('/agents', { recursive: true });

      expect(results).toHaveLength(3); // custom dir, agent1.json, agent2.json
    });

    it('supports maxDepth with recursive listing', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/a/b/c/d/file.json'));
      vfs.mount(volume);

      const results = await vfs.list('/a', { recursive: true, maxDepth: 1 });

      expect(results).toHaveLength(2); // /a/b dir, /a/b/c dir
      expect(results.map((e) => e.path)).toEqual(['/a/b', '/a/b/c']);
    });
  });

  describe('glob', () => {
    it('globs across multiple volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      volume1.add(createFileEntry('/tool_results/esql/query1.json'));
      volume2.add(createFileEntry('/attachments/dashboard/dash1.json'));

      vfs.mount(volume1);
      vfs.mount(volume2);

      const results = await vfs.glob('/**/*.json');

      expect(results).toHaveLength(2);
    });

    it('supports cwd option', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      volume.add(createFileEntry('/other/file.json'));
      vfs.mount(volume);

      const results = await vfs.glob('*.json', { cwd: '/agents' });

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('/agents/agent1.json');
    });

    it('deduplicates results across volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');

      volume1.add(createFileEntry('/shared/file.json', { source: 'v1' }));
      volume2.add(createFileEntry('/shared/file.json', { source: 'v2' }));

      vfs.mount(volume1);
      vfs.mount(volume2);

      const results = await vfs.glob('/shared/*.json');

      expect(results).toHaveLength(1);
      expect((results[0] as FileEntry).content.raw).toEqual({ source: 'v1' }); // first-wins
    });
  });

  describe('exists', () => {
    it('returns true if path exists in any volume', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      vfs.mount(volume);

      expect(await vfs.exists('/agents/agent1.json')).toBe(true);
      expect(await vfs.exists('/agents')).toBe(true);
    });

    it('returns false if path does not exist', async () => {
      const vfs = new VirtualFileSystem();

      expect(await vfs.exists('/agents/agent1.json')).toBe(false);
    });
  });

  describe('isFile / isDirectory', () => {
    it('correctly identifies files', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      vfs.mount(volume);

      expect(await vfs.isFile('/agents/agent1.json')).toBe(true);
      expect(await vfs.isDirectory('/agents/agent1.json')).toBe(false);
    });

    it('correctly identifies directories', async () => {
      const vfs = new VirtualFileSystem();
      const volume = new MemoryVolume('test');
      volume.add(createFileEntry('/agents/agent1.json'));
      vfs.mount(volume);

      expect(await vfs.isDirectory('/agents')).toBe(true);
      expect(await vfs.isFile('/agents')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('unmounts all volumes', async () => {
      const vfs = new VirtualFileSystem();
      const volume1 = new MemoryVolume('v1');
      const volume2 = new MemoryVolume('v2');
      volume1.add(createFileEntry('/v1/file.json'));
      volume2.add(createFileEntry('/v2/file.json'));
      vfs.mount(volume1);
      vfs.mount(volume2);

      await vfs.dispose();

      expect(await vfs.exists('/v1/file.json')).toBe(false);
      expect(await vfs.exists('/v2/file.json')).toBe(false);
    });
  });
});
