/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileStore, LsEntry } from '@kbn/agent-builder-server/runner/filestore';
import { createFilestoreEntry, createDirEntry } from '../../../../test_utils/filestore';
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
      createFilestoreEntry('/file1.txt'),
      createFilestoreEntry('/file2.txt'),
      createFilestoreEntry('/file3.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── file1.txt
├── file2.txt
└── file3.txt`);
  });

  it('should show single file by name', async () => {
    const store = createMockStore([createFilestoreEntry('/file1.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file1.txt`);
  });

  it('should show "[X more files]" when exceeding maxFilesPerFolder', async () => {
    const store = createMockStore([
      createFilestoreEntry('/file1.txt'),
      createFilestoreEntry('/file2.txt'),
      createFilestoreEntry('/file3.txt'),
      createFilestoreEntry('/file4.txt'),
      createFilestoreEntry('/file5.txt'),
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
      createFilestoreEntry('/aaa.txt'),
      createFilestoreEntry('/bbb.txt'),
      createFilestoreEntry('/ccc.txt'),
      createFilestoreEntry('/ddd.txt'),
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
      createFilestoreEntry('/file1.txt'),
      createFilestoreEntry('/file2.txt'),
      createFilestoreEntry('/file3.txt'),
      createFilestoreEntry('/file4.txt'),
      createFilestoreEntry('/file5.txt'),
    ]);

    const result = await buildFolderTree(store, { maxFilesPerFolder: 1 });

    expect(result).toBe(`/
├── file1.txt
└── [4 more files]`);
  });

  it('should sort files alphabetically', async () => {
    const store = createMockStore([
      createFilestoreEntry('/zebra.txt'),
      createFilestoreEntry('/alpha.txt'),
      createFilestoreEntry('/beta.txt'),
    ]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
├── alpha.txt
├── beta.txt
└── zebra.txt`);
  });

  it('should show directories sorted alphabetically', async () => {
    const store = createMockStore([
      createDirEntry('/zebra', [createFilestoreEntry('/zebra/file.txt')]),
      createDirEntry('/alpha', [createFilestoreEntry('/alpha/file.txt')]),
      createDirEntry('/beta', [createFilestoreEntry('/beta/file.txt')]),
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
      createDirEntry('/folder', [createFilestoreEntry('/folder/nested.txt')]),
      createFilestoreEntry('/root_file.txt'),
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
          createFilestoreEntry('/parent/child/deep.txt'),
          createFilestoreEntry('/parent/child/deep2.txt'),
        ]),
        createFilestoreEntry('/parent/file.txt'),
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
          createFilestoreEntry('/src/components/Button.tsx'),
          createFilestoreEntry('/src/components/Input.tsx'),
        ]),
        createDirEntry('/src/utils', [createFilestoreEntry('/src/utils/helpers.ts')]),
        createFilestoreEntry('/src/index.ts'),
      ]),
      createDirEntry('/docs', [createFilestoreEntry('/docs/README.md')]),
      createFilestoreEntry('/package.json'),
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
      createFilestoreEntry('/custom/path/file.txt'),
      createDirEntry('/custom/path/subdir', [
        createFilestoreEntry('/custom/path/subdir/nested.txt'),
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
        createDirEntry('/parent/child1', [createFilestoreEntry('/parent/child1/file.txt')]),
        createDirEntry('/parent/child2', [createFilestoreEntry('/parent/child2/file.txt')]),
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
        createFilestoreEntry('/folder/a.txt'),
        createFilestoreEntry('/folder/b.txt'),
        createFilestoreEntry('/folder/c.txt'),
        createFilestoreEntry('/folder/d.txt'),
        createFilestoreEntry('/folder/e.txt'),
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
      createDirEntry('/folder', [createFilestoreEntry('/folder/file.txt')]),
      createFilestoreEntry('/root.txt'),
    ]);

    const result = await buildFolderTree(store, { initialIndent: 2 });

    expect(result).toBe(`  /
  ├── folder/
  │   └── file.txt
  └── root.txt`);
  });

  it('should apply larger initialIndent correctly', async () => {
    const store = createMockStore([createFilestoreEntry('/file.txt')]);

    const result = await buildFolderTree(store, { initialIndent: 4 });

    expect(result).toBe(`    /
    └── file.txt`);
  });

  it('should default initialIndent to 0', async () => {
    const store = createMockStore([createFilestoreEntry('/file.txt')]);

    const result = await buildFolderTree(store);

    expect(result).toBe(`/
└── file.txt`);
  });
});
