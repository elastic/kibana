/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformStreamsMemoryTools } from './tool_ids';
import { createMemorySearchTool } from './memory_search';
import { createMemoryReadTool } from './memory_read';
import { createMemoryWriteTool } from './memory_write';
import { createMemoryPatchTool } from './memory_patch';
import { createMemoryListTool } from './memory_list';
import { createMemoryDeleteTool } from './memory_delete';
import { createMemoryRecentChangesTool } from './memory_recent_changes';
import type { MemoryToolsOptions } from './types';

export type { MemoryToolsOptions } from './types';

/**
 * All memory tool IDs.
 */
export const memoryToolIds = [
  platformStreamsMemoryTools.memorySearch,
  platformStreamsMemoryTools.memoryRead,
  platformStreamsMemoryTools.memoryWrite,
  platformStreamsMemoryTools.memoryPatch,
  platformStreamsMemoryTools.memoryList,
  platformStreamsMemoryTools.memoryDelete,
  platformStreamsMemoryTools.memoryRecentChanges,
] as const;

/**
 * Creates all memory tools with the given options.
 */
export const createMemoryTools = (options: MemoryToolsOptions): BuiltinToolDefinition[] => {
  return [
    createMemorySearchTool(options),
    createMemoryReadTool(options),
    createMemoryWriteTool(options),
    createMemoryPatchTool(options),
    createMemoryListTool(options),
    createMemoryDeleteTool(options),
    createMemoryRecentChangesTool(options),
  ];
};
