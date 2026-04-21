/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';

export interface ToolCallEntryMeta {
  tool_result_type: string;
  tool_id: string;
  tool_call_id: string;
}

export type ToolCallFileEntry<TData extends object = object> = FileEntry<TData, ToolCallEntryMeta>;
