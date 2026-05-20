import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
export type { MemoryToolsOptions } from './types';
/**
 * All memory tool IDs.
 */
export declare const memoryToolIds: readonly ["platform.streams.memory.search", "platform.streams.memory.read", "platform.streams.memory.write", "platform.streams.memory.patch", "platform.streams.memory.list", "platform.streams.memory.delete", "platform.streams.memory.recent_changes"];
/**
 * Creates all memory tools with the given options.
 */
export declare const createMemoryTools: (options: MemoryToolsOptions) => BuiltinToolDefinition[];
