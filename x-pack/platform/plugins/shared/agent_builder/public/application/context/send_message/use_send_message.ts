/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { useConversationContext } from '../conversation/conversation_context';
import { useConversationId } from '../conversation/use_conversation_id';
import { useAgentId, useConversation } from '../../hooks/use_conversation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { useSendMessageContext, useStreamRecord } from './send_message_context';

/**
 * Per-conversation scoped hook. Use INSIDE a conversation tree — it reads `conversationId`
 * and `agentId` from context. Components asking "am I streaming?" get an answer about
 * their own conversation, not the global app.
 *
 * Outside a conversation tree (e.g. the global sidebar), use `useSendMessageContext()`
 * directly.
 */
export const useSendMessage = () => {
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const { conversation } = useConversation();
  const { attachments, resetAttachments, browserApiTools } = useConversationContext();
  const { selectedConnector: connectorId } = useConnectorSelection();

  const {
    activeStream,
    mutateSendMessage,
    mutateResumeRound,
    cancelActiveStream,
    removeError: removeErrorCtx,
  } = useSendMessageContext();

  const record = useStreamRecord(conversationId);

  const isMyStreamActive = Boolean(
    activeStream && conversationId && activeStream.conversationId === conversationId
  );

  const lastRound = conversation?.rounds?.at(-1);
  const isLastRoundInProgress = lastRound?.status === ConversationRoundStatus.inProgress;

  const isResponseLoading =
    isMyStreamActive && (isLastRoundInProgress || activeStream?.type === 'resume');
  const isResuming = isMyStreamActive && activeStream?.type === 'resume';
  const isRegenerating = isMyStreamActive && activeStream?.type === 'regenerate';

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
    cancelActiveStream();
  }, [cancelActiveStream]);

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
      agentReasoning: isMyStreamActive ? activeStream?.agentReasoning ?? null : null,
      canCancel: isMyStreamActive,
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
      activeStream?.agentReasoning,
    ]
  );
};
