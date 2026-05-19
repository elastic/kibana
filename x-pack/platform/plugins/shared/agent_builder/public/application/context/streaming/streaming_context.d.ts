/**
 * Lifted streaming state.
 *
 * `StreamingProvider` is mounted ONCE above the routes/sidebar (in `mount.tsx` for the
 * routed app, in `embeddable_conversations_provider.tsx` for the embeddable). All streaming
 * state lives here so the sidebar can observe it.
 *
 * State:
 *   - `activeStreams`: `Map<conversationId, { type, agentReasoning }>`. Each in-flight
 *     stream owns one entry. Set synchronously when each mutation kicks off; deleted in
 *     the mutation's `finally`. Multiple entries can coexist — concurrent streams.
 *   - `byConversationId`: per-conversation pending message, error, and errorSteps.
 *     Persists across stream end so a user can hit Retry after a failure.
 */
import React from 'react';
import type { SendMessageVars } from './use_send_message_mutation';
import type { ResumeRoundVars } from './use_resume_round_mutation';
import type { ActiveStream, StreamRecord } from './types';
export interface StreamingContextValue {
    activeStreams: Map<string, ActiveStream>;
    byConversationId: Record<string, StreamRecord>;
    mutateSendMessage: (vars: SendMessageVars) => void;
    mutateResumeRound: (vars: ResumeRoundVars) => void;
    cancelStream: (conversationId: string) => void;
    cancelAllStreams: () => void;
    removeError: (conversationId: string) => void;
    removeAllErrors: () => void;
}
export declare const StreamingProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useStreamingContext: () => StreamingContextValue;
export declare const useStreamRecord: (conversationId: string | undefined) => StreamRecord;
