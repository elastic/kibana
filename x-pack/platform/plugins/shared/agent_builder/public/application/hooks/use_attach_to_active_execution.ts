/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import { useConversation } from './use_conversation';

/**
 * Attaches the current view to the conversation's running execution when the saved
 * conversation points at one and nothing here is streaming it yet: after a reload, on return to
 * the conversation, or when the poll of a shared conversation picks up another participant's run.
 */
export const useAttachToActiveExecution = (): void => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const { activeStreams, mutateAttach } = useStreamingContext();

  const executionId = conversation?.active_execution?.execution_id;
  const isStreaming = conversationId ? activeStreams.has(conversationId) : false;

  useEffect(() => {
    if (!conversationId || !executionId || isStreaming) {
      return;
    }
    mutateAttach({ conversationId, executionId });
  }, [conversationId, executionId, isStreaming, mutateAttach]);
};
