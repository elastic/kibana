/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IFileStore,
  FsEntry,
  FileEntry,
  LsEntry,
  GrepMatch,
  DirEntryWithChildren,
} from '@kbn/agent-builder-server/runner/filestore';
import type { IVirtualFileSystem } from './filesystem';
import { normalizePath, dirname } from './filesystem/path_utils';

export class FileSystemStore implements IFileStore {
  private readonly filesystem: IVirtualFileSystem;

  constructor({ filesystem }: { filesystem: IVirtualFileSystem }) {
    this.filesystem = filesystem;
  }

  /**
   * Read a file entry from the store.
   * Returns undefined if the path doesn't exist or is a directory.
   */
  async read(path: string): Promise<FileEntry | undefined> {
    const entry = await this.filesystem.get(path);
    if (entry?.type === 'file') {
      return entry;
    }
    return undefined;
  }

  /**
   * List files and directories at the given path.
   * When depth > 1, directories will contain nested children.
   */
  async ls(path: string, options: { depth?: number } = {}): Promise<LsEntry[]> {
    const { depth = 1 } = options;
    const normalizedPath = normalizePath(path);

    if (depth <= 1) {
      // Simple case: just list immediate children
      return this.filesystem.list(normalizedPath);
    }

    // Get flat list with recursion
    const flatEntries = await this.filesystem.list(normalizedPath, {
      recursive: true,
      maxDepth: depth - 1,
    });

    return this.buildTree(normalizedPath, flatEntries);
  }

  /**
   * List files matching the given glob pattern.
   */
  async glob(pattern: string): Promise<FileEntry[]> {
    const entries = await this.filesystem.glob(pattern, { onlyFiles: true });
    return entries as FileEntry[];
  }

  /**
   * Search files with text matching the given pattern.
   * By default, pattern is treated as a regex. Use `fixed: true` for literal text matching.
   */
  async grep(
    pattern: string,
    globPattern: string,
    options: { context?: number; fixed?: boolean } = {}
  ): Promise<GrepMatch[]> {
    const { context = 0, fixed = false } = options;

    // Create matcher function based on fixed flag
    const matcher = fixed
      ? (line: string) => line.includes(pattern)
      : this.createRegexMatcher(pattern);

    // Find files matching glob
    const files = await this.glob(globPattern);
    const matches: GrepMatch[] = [];

    for (const file of files) {
      const text = this.getSearchableText(file);
      const lines = text.split('\n');

      // Search each line
      for (let i = 0; i < lines.length; i++) {
        if (matcher(lines[i])) {
          matches.push({
            entry: file,
            line: i + 1, // 1-indexed
            match: this.extractWithContext(lines, i, context),
          });
        }
      }
    }

    return matches;
  }

  /**
   * Create a regex-based matcher function.
   */
  private createRegexMatcher(pattern: string): (line: string) => boolean {
    const regex = new RegExp(pattern, 'gm');
    return (line: string) => {
      regex.lastIndex = 0; // Reset regex state before each test
      return regex.test(line);
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Build a nested tree structure from a flat list of entries.
   */
  private buildTree(basePath: string, flatEntries: FsEntry[]): LsEntry[] {
    // Map to store directory entries by path (so we can attach children)
    const dirMap = new Map<string, DirEntryWithChildren>();

    // First pass: create DirEntryWithChildren for all directories
    for (const entry of flatEntries) {
      if (entry.type === 'dir') {
        dirMap.set(entry.path, { ...entry, children: [] });
      }
    }

    // Second pass: attach entries to their parent directories
    for (const entry of flatEntries) {
      const parentPath = dirname(entry.path);

      if (parentPath === basePath) {
        // This is a direct child of the base path, will be included in result
        continue;
      }

      // Find parent directory and attach this entry as a child
      const parentDir = dirMap.get(parentPath);
      if (parentDir && parentDir.children) {
        if (entry.type === 'dir') {
          // Add the directory with children from our map
          const dirWithChildren = dirMap.get(entry.path);
          if (dirWithChildren) {
            parentDir.children.push(dirWithChildren);
          }
        } else {
          parentDir.children.push(entry);
        }
      }
    }

    // Return only top-level entries (direct children of basePath)
    const result: LsEntry[] = [];
    for (const entry of flatEntries) {
      const parentPath = dirname(entry.path);
      if (parentPath === basePath) {
        if (entry.type === 'dir') {
          const dirWithChildren = dirMap.get(entry.path);
          if (dirWithChildren) {
            result.push(dirWithChildren);
          }
        } else {
          result.push(entry);
        }
      }
    }

    return result;
  }

  /**
   * Get the searchable text content of a file.
   * Uses plain_text if available, otherwise stringifies raw content.
   */
  private getSearchableText(file: FileEntry): string {
    return file.content.plain_text ?? JSON.stringify(file.content.raw, null, 2);
  }

  /**
   * Extract lines around a match with the specified context.
   */
  private extractWithContext(lines: string[], matchIndex: number, context: number): string {
    const start = Math.max(0, matchIndex - context);
    const end = Math.min(lines.length - 1, matchIndex + context);
    return lines.slice(start, end + 1).join('\n');
  }
}
