/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZipArchive } from './open_zip_archive';
import { createScopedArchive, detectArchiveRootPrefix } from './create_scoped_archive';

const createMockArchive = (files: Record<string, string>): ZipArchive => {
  return {
    hasEntry: (path: string) => path in files,
    getEntryPaths: () => Object.keys(files),
    getEntryContent: async (path: string) => {
      if (!(path in files)) {
        throw new Error(`Entry ${path} not found in archive`);
      }
      return Buffer.from(files[path], 'utf-8');
    },
    close: jest.fn(),
  };
};

describe('createScopedArchive', () => {
  it('rebases entry paths relative to the prefix', () => {
    const inner = createMockArchive({
      'repo-main/': '',
      'repo-main/plugin.json': '{}',
      'repo-main/skills/': '',
      'repo-main/skills/my-skill/SKILL.md': 'content',
    });

    const scoped = createScopedArchive(inner, 'repo-main/');

    expect(scoped.getEntryPaths().sort()).toEqual([
      'plugin.json',
      'skills/',
      'skills/my-skill/SKILL.md',
    ]);
  });

  it('does not include the prefix directory itself', () => {
    const inner = createMockArchive({
      'prefix/': '',
      'prefix/file.txt': 'content',
    });

    const scoped = createScopedArchive(inner, 'prefix/');

    expect(scoped.getEntryPaths()).toEqual(['file.txt']);
  });

  it('resolves hasEntry through the prefix', () => {
    const inner = createMockArchive({
      'repo-main/skills/SKILL.md': 'content',
    });

    const scoped = createScopedArchive(inner, 'repo-main/');

    expect(scoped.hasEntry('skills/SKILL.md')).toBe(true);
    expect(scoped.hasEntry('other.txt')).toBe(false);
  });

  it('reads entry content through the prefix', async () => {
    const inner = createMockArchive({
      'repo-main/data.txt': 'hello world',
    });

    const scoped = createScopedArchive(inner, 'repo-main/');

    const content = await scoped.getEntryContent('data.txt');
    expect(content.toString('utf-8')).toBe('hello world');
  });

  it('throws when reading a non-existent scoped entry', async () => {
    const inner = createMockArchive({
      'repo-main/exists.txt': 'yes',
    });

    const scoped = createScopedArchive(inner, 'repo-main/');

    await expect(scoped.getEntryContent('missing.txt')).rejects.toThrow(/not found/);
  });

  it('filters out entries outside the prefix', () => {
    const inner = createMockArchive({
      'repo-main/plugin/file.txt': 'inside',
      'repo-main/other/file.txt': 'outside',
    });

    const scoped = createScopedArchive(inner, 'repo-main/plugin/');

    expect(scoped.getEntryPaths()).toEqual(['file.txt']);
    expect(scoped.hasEntry('file.txt')).toBe(true);
  });

  it('handles prefix without trailing slash', () => {
    const inner = createMockArchive({
      'prefix/file.txt': 'content',
    });

    const scoped = createScopedArchive(inner, 'prefix');

    expect(scoped.getEntryPaths()).toEqual(['file.txt']);
  });

  it('delegates close to the inner archive', () => {
    const inner = createMockArchive({});

    const scoped = createScopedArchive(inner, 'prefix/');
    scoped.close();

    expect(inner.close).toHaveBeenCalled();
  });

  it('returns the original archive unchanged when prefix is empty', () => {
    const inner = createMockArchive({
      'plugin.json': '{}',
      'skills/my-skill/SKILL.md': 'content',
    });

    const scoped = createScopedArchive(inner, '');

    expect(scoped).toBe(inner);
    expect(scoped.getEntryPaths()).toEqual(['plugin.json', 'skills/my-skill/SKILL.md']);
  });
});

describe('detectArchiveRootPrefix', () => {
  it('detects a single top-level directory', () => {
    const archive = createMockArchive({
      'claude-code-main/': '',
      'claude-code-main/plugin.json': '{}',
      'claude-code-main/skills/SKILL.md': 'content',
    });

    expect(detectArchiveRootPrefix(archive)).toBe('claude-code-main/');
  });

  it('returns empty string when entries have no common prefix', () => {
    const archive = createMockArchive({
      'file-a.txt': 'a',
      'file-b.txt': 'b',
    });

    expect(detectArchiveRootPrefix(archive)).toBe('');
  });

  it('returns empty string for an empty archive', () => {
    const archive = createMockArchive({});

    expect(detectArchiveRootPrefix(archive)).toBe('');
  });

  it('returns empty string when multiple top-level directories exist', () => {
    const archive = createMockArchive({
      'dir-a/file.txt': 'a',
      'dir-b/file.txt': 'b',
    });

    expect(detectArchiveRootPrefix(archive)).toBe('');
  });
});
