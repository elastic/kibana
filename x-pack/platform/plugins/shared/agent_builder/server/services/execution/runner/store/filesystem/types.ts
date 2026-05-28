/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FsEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { Volume } from '@kbn/agent-builder-server/runner';

// ============================================================================
// VirtualFileSystem types
// ============================================================================

/**
 * Options for mounting a volume.
 */
export interface MountOptions {
  /** Priority (lower = higher priority). Default: registration order */
  priority?: number;
}

/**
 * Options for VFS glob operations.
 */
export interface GlobOptions {
  /** Only return files (no directories) */
  onlyFiles?: boolean;
  /** Only return directories (no files) */
  onlyDirectories?: boolean;
  /** Base directory for relative patterns */
  cwd?: string;
}

/**
 * Options for VFS list operations.
 */
export interface ListOptions {
  /** Include entries from subdirectories (recursive). Default: false */
  recursive?: boolean;
  /** Maximum depth when recursive (default: unlimited) */
  maxDepth?: number;
}

/**
 * Interface for a virtual filesystem that aggregates multiple volumes.
 * All methods are async to support lazy/remote volume implementations.
 */
export interface IVirtualFileSystem {
  /**
   * Mount a volume.
   * Returns a function to unmount the volume.
   */
  mount(volume: Volume, options?: MountOptions): () => Promise<void>;

  /**
   * Get entry by exact path.
   * Returns FileEntry for files, DirEntry for directories.
   */
  get(path: string): Promise<FsEntry | undefined>;

  /**
   * List contents of a directory.
   */
  list(dirPath: string, options?: ListOptions): Promise<FsEntry[]>;

  /**
   * Find entries matching glob pattern(s).
   */
  glob(patterns: string | string[], options?: GlobOptions): Promise<FsEntry[]>;

  /**
   * Check if path exists (file or directory).
   */
  exists(path: string): Promise<boolean>;

  /**
   * Check if path is a directory.
   */
  isDirectory(path: string): Promise<boolean>;

  /**
   * Check if path is a file.
   */
  isFile(path: string): Promise<boolean>;

  /**
   * Unmount all volumes and cleanup.
   */
  dispose(): Promise<void>;
}
