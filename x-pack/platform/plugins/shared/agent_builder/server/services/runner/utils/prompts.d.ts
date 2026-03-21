import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import type { PromptManager } from '@kbn/agent-builder-server/runner';
import type { ConfirmationPrompt, PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import type { ToolConfirmationPolicyMode } from '@kbn/agent-builder-server/tools';
export declare const createPromptManager: ({ state, }?: {
    state?: PromptStorageState;
}) => PromptManager;
export declare const getAgentPromptStorageState: ({ input, conversation, }: {
    input: ConverseInput;
    conversation?: Conversation;
}) => PromptStorageState;
export declare const toolConfirmationId: ({ toolId, toolCallId, policyMode, }: {
    toolId: string;
    toolCallId: string;
    policyMode?: ToolConfirmationPolicyMode;
}) => string;
export declare const createToolConfirmationPrompt: ({ confirmationId, tool, }: {
    confirmationId: string;
    tool: InternalToolDefinition;
}) => ConfirmationPrompt;
