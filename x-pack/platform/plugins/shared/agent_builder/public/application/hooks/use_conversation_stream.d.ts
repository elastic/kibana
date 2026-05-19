/**
 * Per-conversation scoped slice of the streaming state machine.
 *
 * Use INSIDE a conversation tree — it reads `conversationId` and `agentId` from context.
 * Components asking "am I streaming?" / "what's my agent reasoning?" get an answer about
 * their own conversation, not the global app.
 *
 * Outside a conversation tree (e.g. the global sidebar), read `useStreamingContext()`
 * directly. This hook lives in `hooks/` rather than alongside the provider in
 * `context/streaming/` because it composes `useConversation` (a sibling in `hooks/`),
 * which itself reads from the streaming context — putting the hook here keeps the
 * import graph linear (`streaming_context` ← `use_conversation` ← `use_conversation_stream`)
 * and avoids the re-export-and-defer-cycle workaround the previous `useSendMessage`
 * (in `context/streaming/`) required.
 */
export declare const useConversationStream: () => {
    sendMessage: ({ message, conversationId: targetConversationId, }: {
        message: string;
        conversationId: string;
    }) => void;
    regenerate: () => void;
    resumeRound: ({ prompts }: {
        prompts: Record<string, {
            allow: boolean;
        }>;
    }) => void;
    retry: () => void;
    cancel: () => void;
    removeError: () => void;
    isResponseLoading: boolean;
    isResuming: boolean;
    isRegenerating: boolean;
    pendingMessage: string | undefined;
    error: unknown;
    errorSteps: import("@kbn/agent-builder-common").ConversationRoundStep[];
    agentReasoning: string | null;
    canCancel: boolean;
    isStreaming: boolean;
};
