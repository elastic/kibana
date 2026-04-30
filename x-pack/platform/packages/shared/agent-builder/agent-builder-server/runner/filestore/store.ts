/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry, DirEntry } from './filesystem';

/**
 * Main interface for the public API of the file store.
 */
export interface IFileStore {
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
   * @param glob The glob pattern to match files against.
   * @param options.context Optional number of lines of context to include before and after the match.
   * @param options.fixed If true, treat pattern as literal text (like grep -F). Default: false (regex).
   */
  grep(
    pattern: string,
    glob: string,
    options?: { context?: number; fixed?: boolean }
  ): Promise<GrepMatch[]>;
}

/**
 * Distinct interface for the API exposed to tool handlers.
 * Extends the read-only IFileStore with the ability to write scratch files.
 */
export interface IToolFileStore extends IFileStore {
  /**
   * Write data to a scratch path in the filestore.
   * Files written here persist for the duration of the agent run and can be
   * read back by subsequent tool calls (e.g. jq_filter).
   *
   * @param path Absolute path within the filestore (e.g. `/scratch/my_data.json`)
   * @param data The data to store
   */
  write(path: string, data: unknown): Promise<void>;
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
