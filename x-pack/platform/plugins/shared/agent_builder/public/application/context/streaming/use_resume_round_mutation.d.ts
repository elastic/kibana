import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { PromptResponse } from '@kbn/agent-builder-common/agents';
export interface ResumeRoundVars {
    prompts: Record<string, PromptResponse>;
    conversationId: string;
    agentId: string;
    connectorId?: string;
    browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}
export interface ResumeRoundMutationBindings {
    setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
    clearActiveStream: (conversationId: string) => void;
}
type UseResumeRoundMutationProps = ResumeRoundMutationBindings;
/**
 * Resume mutation, used after a HITL pause when the user clicks Approve / Cancel on a
 * `ConfirmationPrompt`. Same single-scope `mutationFn` shape as the send mutation.
 */
export declare const useResumeRoundMutation: ({ setError, clearActiveStream, }: UseResumeRoundMutationProps) => {
    mutate: import("@tanstack/react-query").UseMutateFunction<void, unknown, ResumeRoundVars, unknown>;
    isLoading: boolean;
    cancel: (conversationId: string) => void;
    cancelAll: () => void;
};
export {};
