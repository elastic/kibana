/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry, DirEntry } from './fs';

export interface IFileSystemStore {
  /**
   * Read a file entry from the store.
   *
   * @param path path of the file to read.
   */
  read(path: string): Promise<FileEntry | undefined>;
  /**
   * List files and directories at the given path.
   *
   * @param path path of the directory to list.
   * @param options.depth optional level of depth to include (default to 1).
   */
  ls(path: string, options?: { depth?: number }): Promise<LsEntry[]>;
  /**
   * List files matching the given glob pattern.
   *
   * @param pattern glob pattern to match.
   */
  glob(pattern: string): Promise<FileEntry[]>;
  /**
   * Search files with text matching the given pattern.
   *
   * @param pattern The pattern to search for.
   * @param globPattern The glob pattern to match files against.
   * @param options.context Optional number of lines of context to include before and after the match.
   * @param options.fixed If true, treat pattern as literal text (like grep -F). Default: false (regex).
   */
  grep(
    pattern: string,
    globPattern: string,
    options?: { context?: number; fixed?: boolean }
  ): Promise<GrepMatch[]>;
}

export interface DirEntryWithChildren extends DirEntry {
  children?: LsEntry[];
}

export type LsEntry = DirEntryWithChildren | FileEntry;

export interface GrepMatch {
  /**
   * Reference to the file entry that matched.
   */
  entry: FileEntry;
  /**
   * Line number of the match.
   */
  line: number;
  /**
   * The matched text, (with pre/post context lines depending on call options).
   */
  match: string;
}
