/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { isToolCallEvent, isToolResultEvent, platformCoreTools } from '@kbn/agent-builder-common';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useSendMessage } from '../context/send_message/send_message_context';

/**
 * Watches EventsService for `tool_call` and `tool_result` events from the
 * `ask_conversation` tool and updates this conversation's React Query cache when
 * another agent targets it.
 *
 * On `tool_call`:
 *   1. Cancel any in-flight background refetch (staleTime:0 would overwrite the optimistic data).
 *   2. Add an optimistic round so the question appears immediately.
 *   3. Mark the cache as "fresh" (updatedAt 60s ahead) to block automatic refetches.
 *   4. Set isExternalRoundLoading=true so the round shows "Thinking…" not "Completed reasoning".
 *
 * On `tool_result`:
 *   1. Clear the loading state.
 *   2. Invalidate the cache (deferred by setTimeout to render the optimistic round first).
 *      This triggers a refetch that swaps the optimistic round for the real persisted data.
 */
export const useExternalRound = () => {
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const services = useAgentBuilderServices();
  const { setExternalRoundLoading } = useSendMessage();

  const actionsRef = useRef(conversationActions);
  actionsRef.current = conversationActions;
  const setLoadingRef = useRef(setExternalRoundLoading);
  setLoadingRef.current = setExternalRoundLoading;

  const processedCallIds = useRef(new Set<string>());

  useEffect(() => {
    if (!conversationId) return;

    // Accept both the internal ID and the sanitized LangChain name.
    const askConversationIds = new Set([
      platformCoreTools.askConversation,
      platformCoreTools.askConversation.replaceAll('.', '_'),
    ]);

    const sub = services.eventsService.obs$.subscribe((event) => {
      // ── question incoming ────────────────────────────────────────────────
      if (isToolCallEvent(event) && askConversationIds.has(event.data.tool_id)) {
        const params = event.data.params as { conversation_id?: string; question?: string };
        if (params.conversation_id !== conversationId) return;
        if (processedCallIds.current.has(event.data.tool_call_id)) return;
        processedCallIds.current.add(event.data.tool_call_id);

        if (params.question) {
          // Cancel in-flight refetch, add optimistic round, then block further refetches
          // for 60s so staleTime:0 + refetchOnWindowFocus can't overwrite it.
          actionsRef.current.cancelCurrentQuery();
          actionsRef.current.addOptimisticRound({
            userMessage: `[Question from another agent]: ${params.question}`,
          });
          actionsRef.current.markQueryFresh();
          setLoadingRef.current(true);
        }
        return;
      }

      // ── round complete ───────────────────────────────────────────────────
      if (isToolResultEvent(event) && askConversationIds.has(event.data.tool_id)) {
        const result = event.data.results?.[0];
        const data = result?.data as Record<string, unknown> | undefined;
        if (data?.conversation_id !== conversationId) return;

        // tool_call and tool_result may arrive in the same SSE batch (same event-loop tick).
        // React 18 auto-batching would merge addOptimisticRound + invalidateConversation into
        // one render, skipping the "question visible" state. setTimeout(0) breaks the batch.
        setTimeout(() => {
          setLoadingRef.current(false);
          actionsRef.current.invalidateConversation();
        }, 0);
      }
    });

    return () => sub.unsubscribe();
  }, [conversationId, services.eventsService]);
};
