/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FsEntry, DirEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { Volume, MountOptions, GlobOptions, ListOptions, IVirtualFileSystem } from './types';
import { normalizePath, joinPath } from './path_utils';

interface MountedVolume {
  volume: Volume;
  priority: number;
  order: number;
}

/**
 * A virtual filesystem that aggregates multiple volumes.
 *
 * The VFS is a thin orchestration layer that:
 * 1. Receives a request (get, list, glob)
 * 2. Queries each mounted volume in priority order
 * 3. Aggregates results (first-wins for files, merge for directories)
 * 4. Returns combined result
 */
export class VirtualFileSystem implements IVirtualFileSystem {
  private readonly mountedVolumes: MountedVolume[] = [];
  private mountCounter = 0;

  /**
   * Mount a volume.
   * Returns a function to unmount the volume.
   *
   * @param volume The volume to mount
   * @param options Mount options (priority, etc.)
   * @returns A function to unmount the volume
   */
  mount(volume: Volume, options: MountOptions = {}): () => Promise<void> {
    const { priority = 0 } = options;

    const mountedVolume: MountedVolume = {
      volume,
      priority,
      order: this.mountCounter++,
    };

    this.mountedVolumes.push(mountedVolume);
    this.sortVolumes();

    return async () => {
      const index = this.mountedVolumes.indexOf(mountedVolume);
      if (index !== -1) {
        this.mountedVolumes.splice(index, 1);
        await volume.dispose?.();
      }
    };
  }

  /**
   * Get entry by exact path.
   * Queries volumes in priority order, returns first match (first-wins for files).
   * For directories, returns a DirEntry if any volume has that directory.
   */
  async get(path: string): Promise<FsEntry | undefined> {
    const normalizedPath = normalizePath(path);

    // First, try to find a file at this path
    for (const { volume } of this.mountedVolumes) {
      const entry = await volume.get(normalizedPath);
      if (entry) {
        return entry;
      }
    }

    // If no file found, check if it's a directory in any volume
    for (const { volume } of this.mountedVolumes) {
      if (await volume.exists(normalizedPath)) {
        // It exists but wasn't returned by get(), so it must be a directory
        return { path: normalizedPath, type: 'dir' } satisfies DirEntry;
      }
    }

    return undefined;
  }

  /**
   * List contents of a directory.
   * Aggregates results from all volumes, merging directories and using first-wins for files.
   */
  async list(dirPath: string, options: ListOptions = {}): Promise<FsEntry[]> {
    const { recursive = false, maxDepth } = options;
    const normalizedPath = normalizePath(dirPath);

    if (recursive) {
      return this.listRecursive(normalizedPath, 0, maxDepth);
    }

    return this.listSingleLevel(normalizedPath);
  }

  /**
   * Find entries matching glob pattern(s).
   * Aggregates results from all volumes.
   */
  async glob(patterns: string | string[], options: GlobOptions = {}): Promise<FsEntry[]> {
    const { cwd = '/', onlyFiles = false, onlyDirectories = false } = options;

    // Normalize patterns with cwd if they're relative
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    const normalizedPatterns = patternArray.map((p) => {
      if (p.startsWith('/')) {
        return p;
      }
      return joinPath(cwd, p);
    });

    // Collect results from all volumes
    const seenPaths = new Map<string, FsEntry>();

    for (const { volume } of this.mountedVolumes) {
      const entries = await volume.glob(normalizedPatterns, { onlyFiles, onlyDirectories });

      for (const entry of entries) {
        const existingEntry = seenPaths.get(entry.path);

        if (!existingEntry) {
          // First time seeing this path
          seenPaths.set(entry.path, entry);
        } else if (existingEntry.type === 'dir' && entry.type === 'file') {
          // File takes precedence over directory (first-wins)
          seenPaths.set(entry.path, entry);
        }
        // Otherwise keep existing (first-wins for files, first dir wins for dirs)
      }
    }

    return Array.from(seenPaths.values());
  }

  /**
   * Check if path exists (file or directory) in any volume.
   */
  async exists(path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);

    for (const { volume } of this.mountedVolumes) {
      if (await volume.exists(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path is a directory.
   */
  async isDirectory(path: string): Promise<boolean> {
    const entry = await this.get(path);
    return entry?.type === 'dir';
  }

  /**
   * Check if path is a file.
   */
  async isFile(path: string): Promise<boolean> {
    const entry = await this.get(path);
    return entry?.type === 'file';
  }

  /**
   * Unmount all volumes and cleanup.
   */
  async dispose(): Promise<void> {
    const disposePromises = this.mountedVolumes.map(({ volume }) => volume.dispose?.());
    await Promise.all(disposePromises);
    this.mountedVolumes.length = 0;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Sort volumes by priority (lower = higher priority), then by mount order.
   */
  private sortVolumes(): void {
    this.mountedVolumes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.order - b.order;
    });
  }

  /**
   * List a single directory level, aggregating from all volumes.
   */
  private async listSingleLevel(dirPath: string): Promise<FsEntry[]> {
    const seenPaths = new Map<string, FsEntry>();

    for (const { volume } of this.mountedVolumes) {
      const entries = await volume.list(dirPath);

      for (const entry of entries) {
        const existingEntry = seenPaths.get(entry.path);

        if (!existingEntry) {
          // First time seeing this path
          seenPaths.set(entry.path, entry);
        } else if (existingEntry.type === 'dir' && entry.type === 'file') {
          // File takes precedence over directory
          seenPaths.set(entry.path, entry);
        }
        // Otherwise keep existing (first-wins)
      }
    }

    return Array.from(seenPaths.values());
  }

  /**
   * Recursively list directories up to maxDepth.
   */
  private async listRecursive(
    dirPath: string,
    currentDepth: number,
    maxDepth?: number
  ): Promise<FsEntry[]> {
    const entries = await this.listSingleLevel(dirPath);
    const result: FsEntry[] = [];

    for (const entry of entries) {
      result.push(entry);

      // Recurse into directories if within depth limit
      if (entry.type === 'dir') {
        const shouldRecurse = maxDepth === undefined || currentDepth < maxDepth;
        if (shouldRecurse) {
          const subEntries = await this.listRecursive(entry.path, currentDepth + 1, maxDepth);
          result.push(...subEntries);
        }
      }
    }

    return result;
  }
}
