/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common/tools';
import type { FileEntry } from './filestore';
import type { FileEntryAccessor } from './file_entry_accessor';

/**
 * Store to access tool results during execution. Extends `FileEntryAccessor`
 * so callers that need per-result file-level metadata (e.g. `token_count`)
 * can read it without going through the byte-level `IFileSystem`.
 */
export interface ToolResultStore extends FileEntryAccessor {
  has(resultId: string): boolean;
  get(resultId: string): ToolResult;
  /**
   * Look up the VFS entry for a given tool result id. The returned entry's `path`
   * is mount-relative (relative to the `/tool_calls` mount); prefix
   * `MOUNT_POINTS.toolCalls` to obtain the agent-visible path.
   */
  getEntryByResultId(toolResultId: string): Promise<FileEntry | undefined>;
}

/**
 * Writable version of ToolResultStore, used internally by the runner/agent
 */
export interface WritableToolResultStore extends ToolResultStore {
  add(toolCall: ToolCallWithResults): void;
  asReadonly(): ToolResultStore;
}

/**
 * Per-tool-call input for {@link WritableToolResultStore.add}. The store writes the
 * call's `meta.json` plus its result file(s) in a single pass, so it needs the whole
 * call at once. Same field set as `ToolCallWithResult` from `@kbn/agent-builder-common`,
 * declared independently so the store interface owns its own contract.
 */
export interface ToolCallWithResults {
  tool_call_id: string;
  tool_id: string;
  params: Record<string, unknown>;
  results: ToolResult[];
}

export interface ToolResultWithMeta {
  tool_call_id: string;
  tool_id: string;
  result: ToolResult;
}
