/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IFileStore,
  LsEntry,
  DirEntryWithChildren,
  FileEntry,
} from '@kbn/agent-builder-server/runner/filestore';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { buildFolderTree } from './folder_tree';

const createMockFileEntry = (path: string): FileEntry => ({
  path,
  type: 'file',
  metadata: {
    type: FileEntryType.toolResult,
    id: path,
    token_count: 100,
    readonly: true,
  },
  content: { raw: { data: 'test' } },
});

const createMockDirEntry = (path: string, children?: LsEntry[]): DirEntryWithChildren => ({
  path,
  type: 'dir',
  children,
});

const createMockStore = (lsResult: LsEntry[]): IFileStore => ({
  read: jest.fn(),
  ls: jest.fn().mockResolvedValue(lsResult),
  glob: jest.fn(),
  grep: jest.fn(),
});

describe('buildFolderTree', () => {
  it('should return just the root path when there are no entries', async () => {
    const store = createMockStore([]);

    const result = await buildFolderTree(store);

    expect(result).toBe('/');
  });

  it('should show files at root level (up to maxFilesPerFolder)', async () => {
    const store = createMockStore([
      createMockFileEntry('/file1.txt'),
      createMockFileEntry('/file2.txt'),
      createMockFileEntry('/file3.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── file1.txt
├── file2.txt
└── file3.txt`);
  });

  it('should show single file by name', async () => {
    const store = createMockStore([createMockFileEntry('/file1.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file1.txt`);
  });

  it('should show "[X more files]" when exceeding maxFilesPerFolder', async () => {
    const store = createMockStore([
      createMockFileEntry('/file1.txt'),
      createMockFileEntry('/file2.txt'),
      createMockFileEntry('/file3.txt'),
      createMockFileEntry('/file4.txt'),
      createMockFileEntry('/file5.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── file1.txt
├── file2.txt
├── file3.txt
└── [2 more files]`);
  });

  it('should show "[1 more file]" singular when only one more file', async () => {
    const store = createMockStore([
      createMockFileEntry('/aaa.txt'),
      createMockFileEntry('/bbb.txt'),
      createMockFileEntry('/ccc.txt'),
      createMockFileEntry('/ddd.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── aaa.txt
├── bbb.txt
├── ccc.txt
└── [1 more file]`);
  });

  it('should respect custom maxFilesPerFolder option', async () => {
    const store = createMockStore([
      createMockFileEntry('/file1.txt'),
      createMockFileEntry('/file2.txt'),
      createMockFileEntry('/file3.txt'),
      createMockFileEntry('/file4.txt'),
      createMockFileEntry('/file5.txt'),
    ]);

    const result = await buildFolderTree(store, { maxFilesPerFolder: 1 });

    expect(result).toBe(`/
├── file1.txt
└── [4 more files]`);
  });

  it('should sort files alphabetically', async () => {
    const store = createMockStore([
      createMockFileEntry('/zebra.txt'),
      createMockFileEntry('/alpha.txt'),
      createMockFileEntry('/beta.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── alpha.txt
├── beta.txt
└── zebra.txt`);
  });

  it('should show directories sorted alphabetically', async () => {
    const store = createMockStore([
      createMockDirEntry('/zebra', [createMockFileEntry('/zebra/file.txt')]),
      createMockDirEntry('/alpha', [createMockFileEntry('/alpha/file.txt')]),
      createMockDirEntry('/beta', [createMockFileEntry('/beta/file.txt')]),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── alpha/
│   └── file.txt
├── beta/
│   └── file.txt
└── zebra/
    └── file.txt`);
  });

  it('should show directories before files', async () => {
    const store = createMockStore([
      createMockDirEntry('/folder', [createMockFileEntry('/folder/nested.txt')]),
      createMockFileEntry('/root_file.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── folder/
│   └── nested.txt
└── root_file.txt`);
  });

  it('should handle nested directories', async () => {
    const store = createMockStore([
      createMockDirEntry('/parent', [
        createMockDirEntry('/parent/child', [
          createMockFileEntry('/parent/child/deep.txt'),
          createMockFileEntry('/parent/child/deep2.txt'),
        ]),
        createMockFileEntry('/parent/file.txt'),
      ]),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── parent/
    ├── child/
    │   ├── deep.txt
    │   └── deep2.txt
    └── file.txt`);
  });

  it('should handle complex nested structure', async () => {
    const store = createMockStore([
      createMockDirEntry('/src', [
        createMockDirEntry('/src/components', [
          createMockFileEntry('/src/components/Button.tsx'),
          createMockFileEntry('/src/components/Input.tsx'),
        ]),
        createMockDirEntry('/src/utils', [createMockFileEntry('/src/utils/helpers.ts')]),
        createMockFileEntry('/src/index.ts'),
      ]),
      createMockDirEntry('/docs', [createMockFileEntry('/docs/README.md')]),
      createMockFileEntry('/package.json'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── docs/
│   └── README.md
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
└── package.json`);
  });

  it('should use custom starting path', async () => {
    const store = createMockStore([
      createMockFileEntry('/custom/path/file.txt'),
      createMockDirEntry('/custom/path/subdir', [
        createMockFileEntry('/custom/path/subdir/nested.txt'),
      ]),
    ]);

    const result = await buildFolderTree(store, { path: '/custom/path' });

    expect(result).toBe(`/custom/path
├── subdir/
│   └── nested.txt
└── file.txt`);
    expect(store.ls).toHaveBeenCalledWith('/custom/path', { depth: 5 });
  });

  it('should pass maxDepth to ls', async () => {
    const store = createMockStore([]);

    await buildFolderTree(store, { maxDepth: 3 });

    expect(store.ls).toHaveBeenCalledWith('/', { depth: 3 });
  });

  it('should use default depth of 5', async () => {
    const store = createMockStore([]);

    await buildFolderTree(store);

    expect(store.ls).toHaveBeenCalledWith('/', { depth: 5 });
  });

  it('should handle directories with only subdirectories (no files)', async () => {
    const store = createMockStore([
      createMockDirEntry('/parent', [
        createMockDirEntry('/parent/child1', [createMockFileEntry('/parent/child1/file.txt')]),
        createMockDirEntry('/parent/child2', [createMockFileEntry('/parent/child2/file.txt')]),
      ]),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── parent/
    ├── child1/
    │   └── file.txt
    └── child2/
        └── file.txt`);
  });

  it('should show more files entry in nested directories', async () => {
    const store = createMockStore([
      createMockDirEntry('/folder', [
        createMockFileEntry('/folder/a.txt'),
        createMockFileEntry('/folder/b.txt'),
        createMockFileEntry('/folder/c.txt'),
        createMockFileEntry('/folder/d.txt'),
        createMockFileEntry('/folder/e.txt'),
      ]),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── folder/
    ├── a.txt
    ├── b.txt
    ├── c.txt
    └── [2 more files]`);
  });

  it('should apply initialIndent to all lines', async () => {
    const store = createMockStore([
      createMockDirEntry('/folder', [createMockFileEntry('/folder/file.txt')]),
      createMockFileEntry('/root.txt'),
    ]);

    const result = await buildFolderTree(store, { initialIndent: 2 });

    expect(result).toBe(`  /
  ├── folder/
  │   └── file.txt
  └── root.txt`);
  });

  it('should apply larger initialIndent correctly', async () => {
    const store = createMockStore([createMockFileEntry('/file.txt')]);

    const result = await buildFolderTree(store, { initialIndent: 4 });

    expect(result).toBe(`    /
    └── file.txt`);
  });

  it('should default initialIndent to 0', async () => {
    const store = createMockStore([createMockFileEntry('/file.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file.txt`);
  });
});
