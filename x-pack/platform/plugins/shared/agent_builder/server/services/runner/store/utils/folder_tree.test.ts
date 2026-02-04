/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileStore, LsEntry } from '@kbn/agent-builder-server/runner/filestore';
import { createFilestoreVersionedEntry, createDirEntry } from '../../../../test_utils/filestore';
import { createFileSystemStoreMock } from '../../../../test_utils/runner';
import { buildFolderTree } from './folder_tree';

const createMockStore = (lsResult: LsEntry[]): IFileStore => {
  const store = createFileSystemStoreMock();
  store.ls.mockResolvedValue(lsResult);
  return store;
};

describe('buildFolderTree', () => {
  it('should return just the root path when there are no entries', async () => {
    const store = createMockStore([]);

    const result = await buildFolderTree(store);

    expect(result).toBe('/');
  });

  it('should show files at root level (up to maxFilesPerFolder)', async () => {
    const store = createMockStore([
      createFilestoreVersionedEntry('/file1.txt'),
      createFilestoreVersionedEntry('/file2.txt'),
      createFilestoreVersionedEntry('/file3.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── file1.txt
├── file2.txt
└── file3.txt`);
  });

  it('should show single file by name', async () => {
    const store = createMockStore([createFilestoreVersionedEntry('/file1.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file1.txt`);
  });

  it('should show "[X more files]" when exceeding maxFilesPerFolder', async () => {
    const store = createMockStore([
      createFilestoreVersionedEntry('/file1.txt'),
      createFilestoreVersionedEntry('/file2.txt'),
      createFilestoreVersionedEntry('/file3.txt'),
      createFilestoreVersionedEntry('/file4.txt'),
      createFilestoreVersionedEntry('/file5.txt'),
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
      createFilestoreVersionedEntry('/aaa.txt'),
      createFilestoreVersionedEntry('/bbb.txt'),
      createFilestoreVersionedEntry('/ccc.txt'),
      createFilestoreVersionedEntry('/ddd.txt'),
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
      createFilestoreVersionedEntry('/file1.txt'),
      createFilestoreVersionedEntry('/file2.txt'),
      createFilestoreVersionedEntry('/file3.txt'),
      createFilestoreVersionedEntry('/file4.txt'),
      createFilestoreVersionedEntry('/file5.txt'),
    ]);

    const result = await buildFolderTree(store, { maxFilesPerFolder: 1 });

    expect(result).toBe(`/
├── file1.txt
└── [4 more files]`);
  });

  it('should sort files alphabetically', async () => {
    const store = createMockStore([
      createFilestoreVersionedEntry('/zebra.txt'),
      createFilestoreVersionedEntry('/alpha.txt'),
      createFilestoreVersionedEntry('/beta.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── alpha.txt
├── beta.txt
└── zebra.txt`);
  });

  it('should show directories sorted alphabetically', async () => {
    const store = createMockStore([
      createDirEntry('/zebra', [createFilestoreVersionedEntry('/zebra/file.txt')]),
      createDirEntry('/alpha', [createFilestoreVersionedEntry('/alpha/file.txt')]),
      createDirEntry('/beta', [createFilestoreVersionedEntry('/beta/file.txt')]),
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
      createDirEntry('/folder', [createFilestoreVersionedEntry('/folder/nested.txt')]),
      createFilestoreVersionedEntry('/root_file.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── folder/
│   └── nested.txt
└── root_file.txt`);
  });

  it('should handle nested directories', async () => {
    const store = createMockStore([
      createDirEntry('/parent', [
        createDirEntry('/parent/child', [
          createFilestoreVersionedEntry('/parent/child/deep.txt'),
          createFilestoreVersionedEntry('/parent/child/deep2.txt'),
        ]),
        createFilestoreVersionedEntry('/parent/file.txt'),
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
      createDirEntry('/src', [
        createDirEntry('/src/components', [
          createFilestoreVersionedEntry('/src/components/Button.tsx'),
          createFilestoreVersionedEntry('/src/components/Input.tsx'),
        ]),
        createDirEntry('/src/utils', [createFilestoreVersionedEntry('/src/utils/helpers.ts')]),
        createFilestoreVersionedEntry('/src/index.ts'),
      ]),
      createDirEntry('/docs', [createFilestoreVersionedEntry('/docs/README.md')]),
      createFilestoreVersionedEntry('/package.json'),
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
      createFilestoreVersionedEntry('/custom/path/file.txt'),
      createDirEntry('/custom/path/subdir', [
        createFilestoreVersionedEntry('/custom/path/subdir/nested.txt'),
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
      createDirEntry('/parent', [
        createDirEntry('/parent/child1', [
          createFilestoreVersionedEntry('/parent/child1/file.txt'),
        ]),
        createDirEntry('/parent/child2', [
          createFilestoreVersionedEntry('/parent/child2/file.txt'),
        ]),
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
      createDirEntry('/folder', [
        createFilestoreVersionedEntry('/folder/a.txt'),
        createFilestoreVersionedEntry('/folder/b.txt'),
        createFilestoreVersionedEntry('/folder/c.txt'),
        createFilestoreVersionedEntry('/folder/d.txt'),
        createFilestoreVersionedEntry('/folder/e.txt'),
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
      createDirEntry('/folder', [createFilestoreVersionedEntry('/folder/file.txt')]),
      createFilestoreVersionedEntry('/root.txt'),
    ]);

    const result = await buildFolderTree(store, { initialIndent: 2 });

    expect(result).toBe(`  /
  ├── folder/
  │   └── file.txt
  └── root.txt`);
  });

  it('should apply larger initialIndent correctly', async () => {
    const store = createMockStore([createFilestoreVersionedEntry('/file.txt')]);

    const result = await buildFolderTree(store, { initialIndent: 4 });

    expect(result).toBe(`    /
    └── file.txt`);
  });

  it('should default initialIndent to 0', async () => {
    const store = createMockStore([createFilestoreVersionedEntry('/file.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file.txt`);
  });
});
