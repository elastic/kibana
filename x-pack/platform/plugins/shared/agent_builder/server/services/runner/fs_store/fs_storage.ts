/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { memfs, type IFs } from 'memfs';
import fg, {
  type FileSystemAdapter,
  type Options as GlobOptions,
  type Entry as GlobEntry,
} from 'fast-glob';
import type { FileEntry, StoreEntry, DirEntry } from './types';

// TODO: move fast-glob to prod dependencies

const defaultGlobOpts: GlobOptions = {
  cwd: '/',
  absolute: true,
  onlyFiles: false,
  onlyDirectories: false,
  caseSensitiveMatch: true,
};

export class FilesystemStorage {
  private fs!: IFs;
  private fgFsAdapter!: FileSystemAdapter;
  private readonly entries: Map<string, FileEntry> = new Map();

  constructor({ initialEntries = [] }: { initialEntries?: FileEntry[] } = {}) {
    this._init();
    initialEntries.forEach((entry) => this.add(entry));
  }

  clear() {
    this._init();
  }

  add(entry: FileEntry) {
    this.entries.set(entry.path, entry);
    this.fs.mkdirSync(Path.dirname(entry.path), { recursive: true });
    this.fs.writeFileSync(entry.path, entry.path);
  }

  has(path: string) {
    return this.entries.has(path);
  }

  get(path: string): FileEntry | undefined {
    return this.entries.get(path);
  }

  list(dirPath: string): StoreEntry[] {
    const matches = this._glob(`${dirPath}/*`);
    return matches.map((entry) => this._convertEntry(entry));
  }

  private _glob(pattern: string, opts: GlobOptions = {}): GlobEntry[] {
    return fg.sync(pattern, {
      fs: this.fgFsAdapter,
      ...defaultGlobOpts,
      ...opts,
      objectMode: true,
    });
  }

  private _convertEntry(entry: GlobEntry): StoreEntry {
    if (entry.dirent.isDirectory()) {
      return { path: entry.path, type: 'dir' } as DirEntry;
    }
    const storeEntry = this.entries.get(entry.path);
    if (storeEntry) {
      return storeEntry;
    }
    throw new Error(`File entry not found for path: ${entry.path}`);
  }

  private _init() {
    const { fs } = memfs({});
    this.fs = fs;
    this.fgFsAdapter = fs as unknown as FileSystemAdapter;
    this.entries.clear();
  }
}
