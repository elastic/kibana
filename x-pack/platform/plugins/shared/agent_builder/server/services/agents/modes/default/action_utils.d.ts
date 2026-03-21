import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { ToolCallAction, HandoverAction, AgentErrorAction, ExecuteToolAction, ToolPromptAction, AnswerAction, StructuredAnswerAction } from './actions';
export declare const processResearchResponse: (message: AIMessageChunk) => ToolCallAction | HandoverAction | AgentErrorAction;
/**
 * Create execute tool action(s) based on the tool node result.
 *
 * When parallel tool calls are used and one tool triggers a HITL interrupt:
 * - Completed tools are returned as an `ExecuteToolAction`
 * - The first interrupted tool is returned as a `ToolPromptAction`
 *
 * NOTE: If multiple tools trigger HITL in the same batch, only the first
 * interrupt is handled. The others are discarded. This is an accepted
 * limitation for the first iteration of parallel tool call support.
 */
export declare const processToolNodeResponse: (toolNodeResult: BaseMessage[], { logger }?: {
    logger?: Logger;
}) => (ExecuteToolAction | ToolPromptAction)[];
export declare const processAnswerResponse: (message: AIMessageChunk) => AnswerAction | AgentErrorAction;
export declare const processStructuredAnswerResponse: (response: unknown) => StructuredAnswerAction | AnswerAction | AgentErrorAction;
