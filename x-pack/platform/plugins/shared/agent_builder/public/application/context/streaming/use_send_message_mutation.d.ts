import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationAction, ConversationRoundStep } from '@kbn/agent-builder-common';
import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
export interface SendMessageVars {
    message?: string;
    action?: ConversationAction;
    conversationId: string;
    agentId: string;
    connectorId?: string;
    attachments?: AttachmentInput[];
    conversationAttachments?: VersionedAttachment[];
    lastRoundSteps?: ConversationRoundStep[];
    resetAttachments?: () => void;
    browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}
export interface SendMessageMutationBindings {
    updateActiveReasoning: (conversationId: string, reasoning: string) => void;
    setPendingMessage: (conversationId: string, message: string) => void;
    clearPendingMessage: (conversationId: string) => void;
    setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
    clearError: (conversationId: string) => void;
    clearActiveStream: (conversationId: string) => void;
}
type UseSendMessageMutationProps = SendMessageMutationBindings;
/**
 * Send and regenerate-round mutation. Lives in the lifted StreamingProvider so streaming
 * state is visible to the whole app (sidebar included).
 *
 * Single-scope `mutationFn` (setup → try → catch → finally) — no `onMutate` / `onSettled`
 * lifecycle methods, no refs to bridge phases. Each invocation builds its own
 * `streamActions` instance targeting `vars.conversationId`, so stream events keep writing
 * to the right cache regardless of where the user has navigated.
 */
export declare const useSendMessageMutation: ({ updateActiveReasoning, setPendingMessage, clearPendingMessage, setError, clearError, clearActiveStream, }: UseSendMessageMutationProps) => {
    mutate: import("@kbn/react-query").UseMutateFunction<void, unknown, SendMessageVars, unknown>;
    isLoading: boolean;
    cancel: (conversationId: string) => void;
    cancelAll: () => void;
};
export {};
