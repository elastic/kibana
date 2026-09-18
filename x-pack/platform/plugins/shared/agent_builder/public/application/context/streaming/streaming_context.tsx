/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lifted streaming state.
 *
 * `StreamingProvider` is mounted ONCE above the routes/sidebar (in `mount.tsx` for the
 * routed app, in `embeddable_conversations_provider.tsx` for the embeddable). All streaming
 * state lives here so the sidebar can observe it.
 *
 * State:
 *   - `activeStreams`: `Map<conversationId, { type }>`. Each in-flight stream owns one
 *     entry. Set synchronously when each mutation kicks off; deleted in the mutation's
 *     `finally`. Multiple entries can coexist — concurrent streams.
 *   - `byConversationId`: per-conversation pending message, kept until its saved copy is
 *     fetched or the stream is stopped.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import produce from 'immer-v9';
import type { ConversationStreamService } from '../../../services/events';
import { useSendMessageMutation } from './use_send_message_mutation';
import type { SendMessageVars } from './use_send_message_mutation';
import { useResumeRoundMutation } from './use_resume_round_mutation';
import type { ResumeRoundVars } from './use_resume_round_mutation';
import type { ActiveStream, StreamRecord } from './types';
import type { OptimisticAttachments } from '../../utils/build_optimistic_attachments';

export interface StreamingContextValue {
  conversationStreamService: ConversationStreamService;
  activeStreams: Map<string, ActiveStream>;
  byConversationId: Record<string, StreamRecord>;
  mutateSendMessage: (vars: SendMessageVars) => void;
  mutateResumeRound: (vars: ResumeRoundVars) => void;
  cancelStream: (conversationId: string) => void;
  cancelAllStreams: () => void;
}

const StreamingContext = createContext<StreamingContextValue | null>(null);

const emptyRecord: StreamRecord = {};

export const StreamingProvider = ({
  conversationStreamService,
  children,
}: {
  conversationStreamService: ConversationStreamService;
  children: React.ReactNode;
}) => {
  const [activeStreams, setActiveStreams] = useState<Map<string, ActiveStream>>(() => new Map());
  const [byConversationId, setByConversationId] = useState<Record<string, StreamRecord>>({});

  const setActiveStream = useCallback((conversationId: string, value: ActiveStream) => {
    setActiveStreams((prev) => new Map(prev).set(conversationId, value));
  }, []);

  const clearActiveStream = useCallback((conversationId: string) => {
    setActiveStreams((prev) => {
      if (!prev.has(conversationId)) return prev;
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  const setPendingMessage = useCallback(
    (conversationId: string, message: string, attachments?: OptimisticAttachments) => {
      setByConversationId(
        produce((draft) => {
          draft[conversationId] = {
            ...draft[conversationId],
            pendingMessage: message,
            pendingAttachments: attachments,
          };
        })
      );
    },
    []
  );

  const clearPendingMessage = useCallback((conversationId: string) => {
    setByConversationId(
      produce((draft) => {
        if (draft[conversationId]) {
          delete draft[conversationId].pendingMessage;
          delete draft[conversationId].pendingAttachments;
        }
      })
    );
  }, []);

  const sendMutation = useSendMessageMutation({
    conversationStreamService,
    setPendingMessage,
    clearPendingMessage,
    clearActiveStream,
  });

  const resumeMutation = useResumeRoundMutation({
    conversationStreamService,
    clearActiveStream,
  });

  // Pull stable references out of the mutation result objects. The result object itself is
  // a NEW reference each render (React Query rebuilds it), so anything that depends on the
  // whole object would re-evaluate every render. The individual fields below are stable.
  const sendMutate = sendMutation.mutate;
  const sendCancel = sendMutation.cancel;
  const sendCancelAll = sendMutation.cancelAll;
  const resumeMutate = resumeMutation.mutate;
  const resumeCancel = resumeMutation.cancel;
  const resumeCancelAll = resumeMutation.cancelAll;

  const cancelStream = useCallback(
    (conversationId: string) => {
      setActiveStreams((prev) => {
        const current = prev.get(conversationId);
        return current ? new Map(prev).set(conversationId, { ...current, cancelling: true }) : prev;
      });
      sendCancel(conversationId);
      resumeCancel(conversationId);
    },
    [sendCancel, resumeCancel]
  );

  // Each mutation hook owns its own `Map<conversationId, AbortController>` ref; ask each
  // to cancel everything it has installed.
  const cancelAllStreams = useCallback(() => {
    sendCancelAll();
    resumeCancelAll();
  }, [sendCancelAll, resumeCancelAll]);

  // Wrappers around `mutate` that set the per-id `activeStreams` entry SYNCHRONOUSLY before
  // queueing the mutation, so the conversation reads as streaming (Stop, the scroll anchor) in
  // the same render as the send. The mutation's `mutationFn` runs asynchronously, so setting the
  // entry from inside it is too late.
  const mutateSendMessage = useCallback(
    (vars: SendMessageVars) => {
      setActiveStream(vars.conversationId, {
        type: 'send',
      });
      sendMutate(vars);
    },
    [setActiveStream, sendMutate]
  );
  const mutateResumeRound = useCallback(
    (vars: ResumeRoundVars) => {
      setActiveStream(vars.conversationId, {
        type: 'resume',
      });
      resumeMutate(vars);
    },
    [setActiveStream, resumeMutate]
  );

  const value = useMemo<StreamingContextValue>(
    () => ({
      conversationStreamService,
      activeStreams,
      byConversationId,
      mutateSendMessage,
      mutateResumeRound,
      cancelStream,
      cancelAllStreams,
    }),
    [
      conversationStreamService,
      activeStreams,
      byConversationId,
      mutateSendMessage,
      mutateResumeRound,
      cancelStream,
      cancelAllStreams,
    ]
  );

  return <StreamingContext.Provider value={value}>{children}</StreamingContext.Provider>;
};

export const useStreamingContext = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreamingContext must be used within a StreamingProvider');
  }
  return context;
};

export const useConversationStreamService = (): ConversationStreamService => {
  const { conversationStreamService } = useStreamingContext();
  return conversationStreamService;
};

export const useStreamRecord = (conversationId: string | undefined): StreamRecord => {
  const { byConversationId } = useStreamingContext();
  if (!conversationId) return emptyRecord;
  return byConversationId[conversationId] ?? emptyRecord;
};
