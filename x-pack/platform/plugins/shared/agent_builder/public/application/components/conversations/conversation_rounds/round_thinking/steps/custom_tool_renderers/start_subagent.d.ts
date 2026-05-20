import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ItemFactoryEntry } from '../tool_call_thinking';
/**
 * Returns thinking items for a run_subagent tool call.
 */
export declare const getSubAgentThinkingItems: ({ step, stepIndex, }: {
    step: ToolCallStep;
    stepIndex: number;
}) => ItemFactoryEntry[];
