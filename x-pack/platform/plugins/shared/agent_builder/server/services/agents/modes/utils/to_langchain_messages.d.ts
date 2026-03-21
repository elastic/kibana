import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { ConversationRoundStep, ToolCallStep, ToolCallWithResult } from '@kbn/agent-builder-common';
import type { ProcessedConversation, ProcessedConversationRound } from './prepare_conversation';
import type { ToolCallResultTransformer } from './create_result_transformer';
export interface ConversationToLangchainOptions {
    conversation: ProcessedConversation;
    /**
     * Optional function to transform all results from a tool call.
     * When provided, results will be passed through this function.
     * Defaults to identity (no transformation).
     */
    resultTransformer?: ToolCallResultTransformer;
    /**
     * When true, tool call steps will be ignored.
     */
    ignoreSteps?: boolean;
}
/**
 * Converts a conversation to langchain format.
 *
 * When `resultTransformer` is provided, tool results from previous rounds
 * will be passed through the transformer function.
 */
export declare const convertPreviousRounds: ({ conversation, resultTransformer, ignoreSteps, }: ConversationToLangchainOptions) => Promise<BaseMessage[]>;
export declare const roundToLangchain: (round: ProcessedConversationRound, { resultTransformer, ignoreSteps, }?: {
    resultTransformer?: ToolCallResultTransformer;
    ignoreSteps?: boolean;
}) => Promise<BaseMessage[]>;
/**
 * Groups consecutive tool call steps by `tool_call_group_id`.
 * Steps sharing the same group ID are grouped together (parallel calls).
 * Steps without a group ID are each in their own group (backward compat).
 */
export declare const groupToolCallSteps: (steps: ConversationRoundStep[]) => ToolCallStep[][];
/**
 * Creates tool call messages for a single tool call.
 * When `resultTransformer` is provided, results will be passed through it.
 */
export declare const createToolCallMessages: (toolCall: ToolCallWithResult, { resultTransformer }?: {
    resultTransformer?: ToolCallResultTransformer;
}) => Promise<[AIMessage, ToolMessage]>;
