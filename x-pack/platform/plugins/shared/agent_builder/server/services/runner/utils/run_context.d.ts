import type { RunContext, RunToolStackEntry } from '@kbn/agent-builder-server/runner';
import type { ToolCallSource } from '@kbn/agent-builder-server/runner/runner';
export declare const createEmptyRunContext: ({ runId, }?: {
    runId?: string;
}) => RunContext;
export declare const createToolStackEntry: (props: Omit<RunToolStackEntry, "type">) => RunToolStackEntry;
export declare const forkContextForToolRun: ({ parentContext, ...toolEntry }: {
    toolId: string;
    toolCallId?: string;
    source?: ToolCallSource;
    parentContext: RunContext;
}) => RunContext;
export declare const forkContextForAgentRun: ({ parentContext, ...agentEntry }: {
    agentId: string;
    conversationId?: string;
    executionId?: string;
    parentContext: RunContext;
}) => RunContext;
