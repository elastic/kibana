/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry, FsEntry } from './filestore';

/**
 * Read surface for "path-keyed `FileEntry` storage" — exposed by both
 * `ToolResultStore` and `SkillsStore`, and consumed by `VolumeBackedReadOnlyFs`
 * to build a read-only `IFileSystem` over those entries.
 *
 * Provides the typed metadata access (token_count, file type, etc.) that
 * `IFileSystem.readFile` deliberately doesn't expose.
 */
export interface FileEntryAccessor {
  /**
   * Lookup an entry by its absolute path. Returns `undefined` when the path
   * is unknown.
   */
  getEntry(path: string): Promise<FileEntry | undefined>;
  /**
   * List entries directly under a directory. Empty array when the directory
   * doesn't exist.
   */
  listEntries(dirPath: string): Promise<FsEntry[]>;
  /** Whether the given path exists (file or directory). */
  entryExists(path: string): Promise<boolean>;
}
