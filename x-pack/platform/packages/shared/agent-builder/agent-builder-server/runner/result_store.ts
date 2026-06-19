/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common/tools';
import type { FileEntry, FsEntry } from './filestore';

/**
 * Store to access tool results during execution
 */
export interface ToolResultStore {
  has(resultId: string): boolean;
  get(resultId: string): ToolResult;
  /**
   * Lookup a tool-result file entry by its absolute path (e.g.
   * `/tool_calls/{tool_id}/{tool_call_id}/{tool_result_id}.json`). Returns
   * `undefined` when the path is unknown. Use this when you need the typed
   * metadata that the byte-level `IFileSystem.readFile` doesn't expose
   * (e.g. `token_count`).
   */
  getEntry(path: string): Promise<FileEntry | undefined>;
  /**
   * List entries under a directory. Empty array when the directory doesn't
   * exist.
   */
  listEntries(dirPath: string): Promise<FsEntry[]>;
  /** Check whether the given path exists (file or directory) in the store. */
  entryExists(path: string): Promise<boolean>;
}

/**
 * Writable version of ToolResultStore, used internally by the runner/agent
 */
export interface WritableToolResultStore extends ToolResultStore {
  add(result: ToolResultWithMeta): void;
  delete(resultId: string): boolean;
  asReadonly(): ToolResultStore;
}

export interface ToolResultWithMeta {
  tool_call_id: string;
  tool_id: string;
  result: ToolResult;
}
