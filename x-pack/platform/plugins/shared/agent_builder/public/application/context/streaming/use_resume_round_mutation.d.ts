import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
export interface ResumeRoundVars {
    prompts: Record<string, {
        allow: boolean;
    }>;
    conversationId: string;
    agentId: string;
    connectorId?: string;
    lastRoundSteps?: ConversationRoundStep[];
    browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}
export interface ResumeRoundMutationBindings {
    updateActiveReasoning: (conversationId: string, reasoning: string) => void;
    setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
    clearActiveStream: (conversationId: string) => void;
}
type UseResumeRoundMutationProps = ResumeRoundMutationBindings;
/**
 * Resume mutation, used after a HITL pause when the user clicks Approve / Cancel on a
 * `ConfirmationPrompt`. Same single-scope `mutationFn` shape as the send mutation.
 */
export declare const useResumeRoundMutation: ({ updateActiveReasoning, setError, clearActiveStream, }: UseResumeRoundMutationProps) => {
    mutate: import("@kbn/react-query").UseMutateFunction<void, unknown, ResumeRoundVars, unknown>;
    isLoading: boolean;
    cancel: (conversationId: string) => void;
    cancelAll: () => void;
};
export {};
