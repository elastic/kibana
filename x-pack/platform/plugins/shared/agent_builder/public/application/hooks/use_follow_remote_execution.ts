/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import {
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isReasoningEvent,
  isRoundCompleteEvent,
  isThinkingCompleteEvent,
  ConversationRoundStepType,
} from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversation } from './use_conversation';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { queryKeys } from '../query_keys';

/**
 * Multi-user POC: follows a remote execution (started by another user)
 * and dispatches events to the local conversation state for real-time rendering.
 */
export const useFollowRemoteExecution = () => {
  const { chatService } = useAgentBuilderServices();
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const { conversationActions } = useConversationContext();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);

  // Track which execution IDs were started by this client
  const localExecutionIdsRef = useRef<Set<string>>(new Set());
  // Track which execution ID we're currently following
  const followingRef = useRef<string | null>(null);

  const currentExecutionId = conversation?.current_execution_id;

  useEffect(() => {
    if (!currentExecutionId || !conversationId) return;
    // Don't follow our own executions
    if (localExecutionIdsRef.current.has(currentExecutionId)) return;
    // Don't re-follow the same execution
    if (followingRef.current === currentExecutionId) return;

    followingRef.current = currentExecutionId;
    setIsFollowing(true);

    // Add an optimistic round for the remote execution
    conversationActions.addOptimisticRound({
      userMessage: '...',
    });

    const abortController = new AbortController();
    const subscription = chatService
      .followExecution({ conversationId, signal: abortController.signal })
      .subscribe({
        next: (event) => {
          if (isMessageChunkEvent(event)) {
            conversationActions.addAssistantMessageChunk({
              messageChunk: event.data.text_chunk,
            });
          } else if (isMessageCompleteEvent(event)) {
            conversationActions.setAssistantMessage({
              assistantMessage: event.data.message_content,
            });
          } else if (isToolCallEvent(event)) {
            conversationActions.addToolCall({
              step: {
                type: ConversationRoundStepType.toolCall,
                tool_id: event.data.tool_id,
                tool_call_id: event.data.tool_call_id,
                params: event.data.params,
                results: [],
                tool_call_group_id: event.data.tool_call_group_id,
              },
            });
          } else if (isToolResultEvent(event)) {
            conversationActions.setToolCallResult({
              toolCallId: event.data.tool_call_id,
              results: event.data.results,
            });
          } else if (isToolProgressEvent(event)) {
            conversationActions.setToolCallProgress({
              toolCallId: event.data.tool_call_id,
              progress: { message: event.data.message },
            });
          } else if (isReasoningEvent(event)) {
            conversationActions.addReasoningStep({
              step: {
                type: ConversationRoundStepType.reasoning,
                reasoning: event.data.reasoning,
                transient: event.data.transient,
              },
            });
          } else if (isThinkingCompleteEvent(event)) {
            conversationActions.setTimeToFirstToken({
              timeToFirstToken: event.data.time_to_first_token,
            });
          } else if (isRoundCompleteEvent(event)) {
            // Round complete — will re-fetch via invalidation below
          }
        },
        error: () => {
          followingRef.current = null;
          setIsFollowing(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversations.byId(conversationId),
          });
        },
        complete: () => {
          followingRef.current = null;
          setIsFollowing(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversations.byId(conversationId),
          });
        },
      });

    return () => {
      abortController.abort();
      subscription.unsubscribe();
      followingRef.current = null;
      setIsFollowing(false);
    };
  }, [currentExecutionId, conversationId, chatService, conversationActions, queryClient]);

  return {
    /** Whether we're currently following a remote execution */
    isFollowing,
    /** Call this to record an execution ID started by this client (won't be followed) */
    addLocalExecutionId: (id: string) => {
      localExecutionIdsRef.current.add(id);
    },
  };
};
