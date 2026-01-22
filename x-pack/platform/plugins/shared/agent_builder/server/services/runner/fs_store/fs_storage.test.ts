/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesystemStorage, type FileEntry } from './fs_storage';

const createFileEntry = (path: string, overrides: Partial<FileEntry> = {}): FileEntry => ({
  path,
  type: 'file',
  metadata: { type: 'agent', id: path },
  content: { name: `content for ${path}` },
  ...overrides,
});

describe('FilesystemStorage', () => {
  describe('constructor', () => {
    it('creates an empty storage by default', () => {
      const storage = new FilesystemStorage();
      expect(storage.has('/any/path')).toBe(false);
    });

    it('accepts initialEntries', () => {
      const entry = createFileEntry('/agents/agent1.json');
      const storage = new FilesystemStorage({ initialEntries: [entry] });

      expect(storage.has('/agents/agent1.json')).toBe(true);
      expect(storage.get('/agents/agent1.json')).toEqual(entry);
    });
  });

  describe('add', () => {
    it('adds a file entry to the storage', () => {
      const storage = new FilesystemStorage();
      const entry = createFileEntry('/agents/agent1.json');

      storage.add(entry);

      expect(storage.has('/agents/agent1.json')).toBe(true);
    });

    it('creates nested directories as needed', () => {
      const storage = new FilesystemStorage();
      const entry = createFileEntry('/deep/nested/path/file.json');

      storage.add(entry);

      expect(storage.has('/deep/nested/path/file.json')).toBe(true);
    });

    it('overwrites existing entry at the same path', () => {
      const storage = new FilesystemStorage();
      const entry1 = createFileEntry('/agents/agent1.json', { content: { version: 1 } });
      const entry2 = createFileEntry('/agents/agent1.json', { content: { version: 2 } });

      storage.add(entry1);
      storage.add(entry2);

      const result = storage.get('/agents/agent1.json') as FileEntry;
      expect(result.content).toEqual({ version: 2 });
    });
  });

  describe('has', () => {
    it('returns true for existing entries', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/agent1.json'));

      expect(storage.has('/agents/agent1.json')).toBe(true);
    });

    it('returns false for non-existing entries', () => {
      const storage = new FilesystemStorage();

      expect(storage.has('/agents/agent1.json')).toBe(false);
    });

    it('returns false for directories (only tracks files)', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/agent1.json'));

      expect(storage.has('/agents')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the entry for an existing path', () => {
      const storage = new FilesystemStorage();
      const entry = createFileEntry('/agents/agent1.json');
      storage.add(entry);

      expect(storage.get('/agents/agent1.json')).toEqual(entry);
    });

    it('returns undefined for non-existing paths', () => {
      const storage = new FilesystemStorage();

      expect(storage.get('/agents/agent1.json')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes all entries from the storage', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/agent1.json'));
      storage.add(createFileEntry('/agents/agent2.json'));

      storage.clear();

      expect(storage.has('/agents/agent1.json')).toBe(false);
      expect(storage.has('/agents/agent2.json')).toBe(false);
    });

    it('allows adding new entries after clearing', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/agent1.json'));
      storage.clear();

      const newEntry = createFileEntry('/agents/agent2.json');
      storage.add(newEntry);

      expect(storage.has('/agents/agent1.json')).toBe(false);
      expect(storage.has('/agents/agent2.json')).toBe(true);
    });
  });

  describe('list', () => {
    it('returns files in the specified directory', () => {
      const storage = new FilesystemStorage();
      const entry1 = createFileEntry('/agents/agent1.json');
      const entry2 = createFileEntry('/agents/agent2.json');
      storage.add(entry1);
      storage.add(entry2);

      const results = storage.list('/agents');

      expect(results).toHaveLength(2);
      expect(results).toEqual(expect.arrayContaining([entry1, entry2]));
    });

    it('returns subdirectories as DirEntry', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/custom/agent1.json'));

      const results = storage.list('/agents');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ path: '/agents/custom', type: 'dir' });
    });

    it('returns both files and subdirectories', () => {
      const storage = new FilesystemStorage();
      const fileEntry = createFileEntry('/agents/agent1.json');
      storage.add(fileEntry);
      storage.add(createFileEntry('/agents/custom/agent2.json'));

      const results = storage.list('/agents');

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([fileEntry, { path: '/agents/custom', type: 'dir' }])
      );
    });

    it('returns empty array for empty directory', () => {
      const storage = new FilesystemStorage();

      const results = storage.list('/agents');

      expect(results).toEqual([]);
    });

    it('does not return nested files (only immediate children)', () => {
      const storage = new FilesystemStorage();
      storage.add(createFileEntry('/agents/level1/level2/deep.json'));

      const results = storage.list('/agents');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ path: '/agents/level1', type: 'dir' });
    });
  });
});
