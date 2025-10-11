/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import useObservable from 'react-use/lib/useObservable';
import { searchParamNames } from '../search_param_names';
import { useOnechatAgents } from './agents/use_agents';
import { useConversationActions } from './use_conversation_actions';
import { useHasActiveConversation } from './use_conversation';
import { useOnechatServices } from './use_onechat_service';
import { useConversationId } from './use_conversation_id';
import type { ConversationSettings } from '../../services/types';

export const useSyncAgentId = () => {
  const { agents } = useOnechatAgents();
  const { setAgentId } = useConversationActions();
  const { conversationSettingsService } = useOnechatServices();
  const [searchParams] = useSearchParams();
  const syncedRef = useRef(false);
  const lastConversationIdRef = useRef<string | undefined>(undefined);
  const hasActiveConversation = useHasActiveConversation();
  const conversationId = useConversationId();

  // Subscribe to conversation settings to get the isFlyoutMode and defaultAgentId
  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const isFlyoutMode = conversationSettings?.isFlyoutMode;
  const defaultAgentId = conversationSettings?.defaultAgentId;

  useEffect(() => {
    // Reset syncedRef when conversation ID changes (new conversation created)
    if (lastConversationIdRef.current !== conversationId) {
      syncedRef.current = false;
      lastConversationIdRef.current = conversationId;
    }

    if (syncedRef.current || hasActiveConversation) {
      return;
    }

    // If in flyout mode and no agent ID from search params, try to use defaultAgentId from settings
    if (isFlyoutMode && defaultAgentId && agents.some((agent) => agent.id === defaultAgentId)) {
      setAgentId(defaultAgentId);
      syncedRef.current = true;
      return;
    }

    // If we don't have a selected agent id, check for a valid agent id in the search params
    // This is used for the "chat with agent" action on the Agent pages
    const agentIdParam = searchParams.get(searchParamNames.agentId);

    if (agentIdParam && agents.some((agent) => agent.id === agentIdParam)) {
      // Agent id passed to sync is valid, set it and mark as synced
      setAgentId(agentIdParam);
      syncedRef.current = true;
      return;
    }
  }, [
    searchParams,
    setAgentId,
    agents,
    hasActiveConversation,
    isFlyoutMode,
    defaultAgentId,
    conversationId,
  ]);
};
