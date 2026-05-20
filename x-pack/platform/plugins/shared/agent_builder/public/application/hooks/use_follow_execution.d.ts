import type { ConversationRoundStep, AssistantResponse } from '@kbn/agent-builder-common';
interface UseFollowExecutionResult {
    steps: ConversationRoundStep[];
    isLoading: boolean;
    response?: AssistantResponse;
    /** Partial response message, updated as chunks stream in. */
    streamingMessage: string;
    error?: string;
}
export declare const useFollowExecution: (executionId: string | null) => UseFollowExecutionResult;
export {};
