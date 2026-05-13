/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentId, useConversation } from './use_conversation';
import { useConnectorSelection } from './chat/use_connector_selection';
import { useStreamingContext, useStreamRecord } from '../context/streaming/streaming_context';

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
export const useConversationStream = () => {
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const { conversation } = useConversation();
  const { attachments, resetAttachments, browserApiTools } = useConversationContext();
  const { selectedConnector: connectorId } = useConnectorSelection();

  const {
    activeStreams,
    mutateSendMessage,
    mutateResumeRound,
    cancelStream,
    removeError: removeErrorCtx,
  } = useStreamingContext();

  const record = useStreamRecord(conversationId);

  const myStream = conversationId ? activeStreams.get(conversationId) : undefined;
  const isMyStreamActive = Boolean(myStream);

  const lastRound = conversation?.rounds?.at(-1);
  const isLastRoundInProgress = lastRound?.status === ConversationRoundStatus.inProgress;

  const isResponseLoading =
    isMyStreamActive && (isLastRoundInProgress || myStream?.type === 'resume');
  const isResuming = isMyStreamActive && myStream?.type === 'resume';
  const isRegenerating = isMyStreamActive && myStream?.type === 'regenerate';

  const sendMessage = useCallback(
    ({
      message,
      conversationId: targetConversationId,
    }: {
      message: string;
      conversationId: string;
    }) => {
      if (!agentId) {
        throw new Error('agentId is required to send a message');
      }
      mutateSendMessage({
        message,
        conversationId: targetConversationId,
        agentId,
        connectorId,
        attachments,
        conversationAttachments: conversation?.attachments,
        lastRoundSteps: lastRound?.steps,
        resetAttachments,
        browserApiTools,
      });
    },
    [
      mutateSendMessage,
      agentId,
      connectorId,
      attachments,
      conversation?.attachments,
      lastRound?.steps,
      resetAttachments,
      browserApiTools,
    ]
  );

  const regenerate = useCallback(() => {
    if (!conversationId) {
      throw new Error('Cannot regenerate without a conversation id');
    }
    if (!agentId) {
      throw new Error('agentId is required to regenerate');
    }
    mutateSendMessage({
      action: 'regenerate',
      conversationId,
      agentId,
      connectorId,
      conversationAttachments: conversation?.attachments,
      lastRoundSteps: lastRound?.steps,
      browserApiTools,
    });
  }, [
    mutateSendMessage,
    conversationId,
    agentId,
    connectorId,
    conversation?.attachments,
    lastRound?.steps,
    browserApiTools,
  ]);

  const resumeRound = useCallback(
    ({ prompts }: { prompts: Record<string, { allow: boolean }> }) => {
      if (!conversationId) {
        throw new Error('Cannot resume without a conversation id');
      }
      if (!agentId) {
        throw new Error('agentId is required to resume');
      }
      mutateResumeRound({
        prompts,
        conversationId,
        agentId,
        connectorId,
        lastRoundSteps: lastRound?.steps,
        browserApiTools,
      });
    },
    [mutateResumeRound, conversationId, agentId, connectorId, lastRound?.steps, browserApiTools]
  );

  const retry = useCallback(() => {
    if (isResponseLoading || !record.error) return;
    if (!record.pendingMessage) {
      throw new Error('Pending message is not present');
    }
    if (!conversationId) {
      throw new Error('Cannot retry without a conversation id');
    }
    sendMessage({ message: record.pendingMessage, conversationId });
  }, [isResponseLoading, record.error, record.pendingMessage, conversationId, sendMessage]);

  const cancel = useCallback(() => {
    if (conversationId) {
      cancelStream(conversationId);
    }
  }, [cancelStream, conversationId]);

  const removeError = useCallback(() => {
    if (conversationId) {
      removeErrorCtx(conversationId);
    }
  }, [removeErrorCtx, conversationId]);

  return useMemo(
    () => ({
      sendMessage,
      regenerate,
      resumeRound,
      retry,
      cancel,
      removeError,
      isResponseLoading,
      isResuming,
      isRegenerating,
      pendingMessage: record.pendingMessage,
      error: record.error,
      errorSteps: record.errorSteps,
      agentReasoning: myStream?.agentReasoning ?? null,
      canCancel: isMyStreamActive,
      // Use this when the question is "is the conversation locked from external action because
      // a mutation is in flight?" — `isResponseLoading` answers a narrower question (round-level loading
      // spinner semantics) and goes false during HITL pause.
      isStreaming: isMyStreamActive,
    }),
    [
      sendMessage,
      regenerate,
      resumeRound,
      retry,
      cancel,
      removeError,
      isResponseLoading,
      isResuming,
      isRegenerating,
      record.pendingMessage,
      record.error,
      record.errorSteps,
      isMyStreamActive,
      myStream?.agentReasoning,
    ]
  );
};
