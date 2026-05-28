/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FsEntry, FileEntry } from './filestore';

/**
 * Options passed to volume glob operations.
 */
export interface VolumeGlobOptions {
  /** Only return files (no directories) */
  onlyFiles?: boolean;
  /** Only return directories (no files) */
  onlyDirectories?: boolean;
}

/**
 * A volume is a source of file entries. Volumes are queried on-demand and
 * never push data; they're the underlying content sources behind the agent's
 * unified VFS (tool results, skills, etc.).
 */
export interface Volume {
  /** Unique identifier for this volume */
  readonly id: string;

  /**
   * Get a file entry by exact path. Returns undefined if absent.
   */
  get(path: string): Promise<FileEntry | undefined>;

  /**
   * List direct children (files and subdirectories) of a directory.
   * Empty array if the directory doesn't exist.
   */
  list(dirPath: string): Promise<FsEntry[]>;

  /**
   * Match entries against glob pattern(s). Returns both files and directories
   * unless restricted via `options`.
   */
  glob(patterns: string | string[], options?: VolumeGlobOptions): Promise<FsEntry[]>;

  /**
   * Check if a path exists (file or directory).
   */
  exists(path: string): Promise<boolean>;

  /**
   * Optional lifecycle hook — called when the volume is unmounted.
   */
  dispose?(): Promise<void>;
}
