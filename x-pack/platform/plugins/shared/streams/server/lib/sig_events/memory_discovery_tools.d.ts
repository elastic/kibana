import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { MemoryService } from '../memory';
/**
 * Memory tool definitions and callbacks for use in discovery flows
 * (executeAsReasoningAgent). Read-only tools only — writing happens
 * in the dedicated memory_generation task after discovery completes.
 */
export interface MemoryDiscoveryTools {
    tools: Record<string, ToolDefinition>;
    callbacks: Record<string, ToolCallback>;
    promptSnippet: string;
}
export declare const createMemoryDiscoveryTools: ({ memoryService, }: {
    memoryService: MemoryService;
}) => MemoryDiscoveryTools;
