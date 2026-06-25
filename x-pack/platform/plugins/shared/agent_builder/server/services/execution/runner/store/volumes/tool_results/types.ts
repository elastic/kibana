/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';

/**
 * A tool-call result file entry. Carries only the base `FileEntryMetadata`
 * (`type`, `id`, `token_count`, `readonly`); the tool/call identity and the
 * result type live in the call's `meta.json` instead.
 */
export type ToolCallFileEntry<TData extends object = object> = FileEntry<TData>;

/**
 * One entry of the `meta.json` results manifest. Preserves the
 * `result file → tool_result_id` link that the path no longer encodes, and lets
 * the agent triage which result file to open.
 */
export interface ToolCallResultManifestEntry {
  /** Result file name within the call directory (e.g. `result.json`, `result_1.json`). */
  file: string;
  /** The `ToolResultType` of that result (e.g. `resource_list`). */
  type: string;
  tool_result_id: string;
}

/**
 * Content of a tool call's `meta.json` file.
 */
export interface ToolCallMetaContent {
  tool_call_id: string;
  tool_id: string;
  params: Record<string, unknown>;
  results: ToolCallResultManifestEntry[];
}

export type ToolCallMetaFileEntry = FileEntry<ToolCallMetaContent>;
