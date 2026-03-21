import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { PromptFactory } from './prompts';
import type { StateType } from './state';
declare const structuredOutputSchema: {
    [x: string]: unknown;
};
export { structuredOutputSchema };
/**
 * Structured output answer agent with structured error handling.
 * This agent uses structured output mode and returns structured error responses.
 */
export declare const createAnswerAgentStructured: ({ chatModel, promptFactory, events, outputSchema, }: {
    chatModel: InferenceChatModel;
    events: AgentEventEmitter;
    promptFactory: PromptFactory;
    outputSchema?: Record<string, unknown>;
    logger: Logger;
}) => (state: StateType) => Promise<{
    answerActions: (import("./actions").AgentErrorAction | import("./actions").AnswerAction | import("./actions").StructuredAnswerAction)[];
    errorCount: number;
}>;
