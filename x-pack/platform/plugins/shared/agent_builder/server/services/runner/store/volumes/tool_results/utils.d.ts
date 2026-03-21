import type { ConversationRound } from '@kbn/agent-builder-common';
import type { ToolResultWithMeta } from '@kbn/agent-builder-server/runner';
import type { ToolCallFileEntry } from './types';
export declare const getToolCallEntryPath: ({ toolId, toolCallId, toolResultId, }: {
    toolId: string;
    toolCallId: string;
    toolResultId: string;
}) => string;
export declare const createToolCallEntry: (result: ToolResultWithMeta) => ToolCallFileEntry;
export declare const extractConversationToolResults: (conversation: ConversationRound[]) => ToolResultWithMeta[];
