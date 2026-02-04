/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import minimatch from 'minimatch';
import type { FileEntry, FsEntry, DirEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { Volume, VolumeGlobOptions } from './types';
import { normalizePath, getPathSegments } from './path_utils';

/**
 * Internal node structure for the directory tree.
 */
interface DirNode {
  /** Child directories by name */
  children: Map<string, DirNode>;
  /** Files directly in this directory by filename */
  files: Map<string, FileEntry>;
}

/**
 * A volume that stores file entries in memory.
 * Suitable for eager data like tool results and attachments.
 */
export class MemoryVolume implements Volume {
  readonly id: string;

  /** Map of normalized path to FileEntry for O(1) file lookup */
  private readonly fileIndex: Map<string, FileEntry> = new Map();

  /** Root of the directory tree */
  private readonly root: DirNode = this.createDirNode();

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Add a file entry to this volume.
   * The entry's path will be normalized.
   */
  add(entry: FileEntry): void {
    const normalizedPath = normalizePath(entry.path);
    const normalizedEntry: FileEntry = { ...entry, path: normalizedPath };

    // Remove existing entry at this path if any
    if (this.fileIndex.has(normalizedPath)) {
      this.removeFromTree(normalizedPath);
    }

    // Add to file index
    this.fileIndex.set(normalizedPath, normalizedEntry);

    // Add to directory tree
    this.addToTree(normalizedEntry);
  }

  /**
   * Remove an entry by path.
   * Returns true if an entry was removed, false if no entry existed at that path.
   */
  remove(path: string): boolean {
    const normalizedPath = normalizePath(path);

    if (!this.fileIndex.has(normalizedPath)) {
      return false;
    }

    this.fileIndex.delete(normalizedPath);
    this.removeFromTree(normalizedPath);
    return true;
  }

  /**
   * Clear all entries from this volume.
   */
  clear(): void {
    this.fileIndex.clear();
    this.root.children.clear();
    this.root.files.clear();
  }

  /**
   * Check if this volume contains a file at the given path.
   * Note: This only checks for files, not implicit directories.
   */
  has(path: string): boolean {
    return this.fileIndex.has(normalizePath(path));
  }

  // ============================================================================
  // Volume interface implementation (async)
  // ============================================================================

  async get(path: string): Promise<FileEntry | undefined> {
    return this.fileIndex.get(normalizePath(path));
  }

  async list(dirPath: string): Promise<FsEntry[]> {
    const normalizedPath = normalizePath(dirPath);
    const node = this.getNode(normalizedPath);

    if (!node) {
      return [];
    }

    const entries: FsEntry[] = [];

    // Add subdirectories
    for (const [childName] of node.children) {
      const childPath = normalizedPath === '/' ? `/${childName}` : `${normalizedPath}/${childName}`;
      entries.push({ path: childPath, type: 'dir' } satisfies DirEntry);
    }

    // Add files
    for (const file of node.files.values()) {
      entries.push(file);
    }

    return entries;
  }

  async glob(patterns: string | string[], options: VolumeGlobOptions = {}): Promise<FsEntry[]> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    const { onlyFiles = false, onlyDirectories = false } = options;

    const entries: FsEntry[] = [];
    const seenPaths = new Set<string>();

    // Helper to check if a path matches any of the patterns
    const matchesPatterns = (path: string): boolean => {
      return patternArray.some((pattern) => minimatch(path, pattern, { dot: true }));
    };

    // Collect all file paths
    const allFilePaths = Array.from(this.fileIndex.keys());

    // Collect all implicit directory paths
    const allDirPaths = this.getAllDirectoryPaths();

    // Match files (unless onlyDirectories)
    if (!onlyDirectories) {
      for (const filePath of allFilePaths) {
        if (matchesPatterns(filePath) && !seenPaths.has(filePath)) {
          seenPaths.add(filePath);
          const entry = this.fileIndex.get(filePath);
          if (entry) {
            entries.push(entry);
          }
        }
      }
    }

    // Match directories (unless onlyFiles)
    if (!onlyFiles) {
      for (const dirPath of allDirPaths) {
        if (matchesPatterns(dirPath) && !seenPaths.has(dirPath)) {
          seenPaths.add(dirPath);
          entries.push({ path: dirPath, type: 'dir' } satisfies DirEntry);
        }
      }
    }

    return entries;
  }

  async exists(path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);

    // Check if it's a file
    if (this.fileIndex.has(normalizedPath)) {
      return true;
    }

    // Check if it's an implicit directory
    const node = this.getNode(normalizedPath);
    return node !== undefined;
  }

  async dispose(): Promise<void> {
    this.clear();
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private createDirNode(): DirNode {
    return {
      children: new Map(),
      files: new Map(),
    };
  }

  /**
   * Add a file entry to the directory tree.
   * Creates intermediate directories as needed.
   */
  private addToTree(entry: FileEntry): void {
    const segments = getPathSegments(entry.path);
    const fileName = segments.pop()!;

    // Navigate/create to parent directory
    let node = this.root;
    for (const segment of segments) {
      let child = node.children.get(segment);
      if (!child) {
        child = this.createDirNode();
        node.children.set(segment, child);
      }
      node = child;
    }

    // Add file to the directory
    node.files.set(fileName, entry);
  }

  /**
   * Remove a file from the directory tree.
   * Cleans up empty intermediate directories.
   */
  private removeFromTree(path: string): void {
    const segments = getPathSegments(path);
    const fileName = segments.pop()!;

    // Navigate to parent directory
    const nodeStack: Array<{ node: DirNode; segment: string }> = [];
    let node = this.root;

    for (const segment of segments) {
      const child = node.children.get(segment);
      if (!child) {
        return; // Path doesn't exist in tree
      }
      nodeStack.push({ node, segment });
      node = child;
    }

    // Remove the file
    node.files.delete(fileName);

    // Clean up empty directories (walk back up the tree)
    while (nodeStack.length > 0) {
      const { node: parent, segment } = nodeStack.pop()!;
      const child = parent.children.get(segment)!;

      if (child.files.size === 0 && child.children.size === 0) {
        parent.children.delete(segment);
      } else {
        // Stop cleanup if directory is not empty
        break;
      }
    }
  }

  /**
   * Get the DirNode at the given path, or undefined if it doesn't exist.
   */
  private getNode(path: string): DirNode | undefined {
    const segments = getPathSegments(path);

    let node = this.root;
    for (const segment of segments) {
      const child = node.children.get(segment);
      if (!child) {
        return undefined;
      }
      node = child;
    }

    return node;
  }

  /**
   * Get all implicit directory paths.
   */
  private getAllDirectoryPaths(): string[] {
    const paths: string[] = [];

    const walk = (node: DirNode, currentPath: string) => {
      for (const [name, child] of node.children) {
        const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        paths.push(childPath);
        walk(child, childPath);
      }
    };

    // Include root only if it has content
    if (this.root.children.size > 0 || this.root.files.size > 0) {
      paths.push('/');
    }

    walk(this.root, '/');
    return paths;
  }
}
