/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { searchParamNames } from '../search_param_names';
import { useOnechatAgents } from './agents/use_agents';
import { useConversationActions } from './use_conversation_actions';
import { useHasActiveConversation } from './use_conversation';

export const useSyncAgentId = () => {
  const { agents } = useOnechatAgents();
  const { setAgentId } = useConversationActions();
  const [searchParams] = useSearchParams();
  const syncedRef = useRef(false);
  const hasActiveConversation = useHasActiveConversation();

  useEffect(() => {
    if (syncedRef.current || hasActiveConversation) {
      return;
    }

    // If we don't have a selected agent id, check for a valid agent id in the search params
    // This is used for the "chat with agent" action on the Agent pages
    const agentIdParam = searchParams.get(searchParamNames.agentId);

    if (agentIdParam && agents.some((agent) => agent.id === agentIdParam)) {
      // Agent id passed to sync is valid, set it and mark as synced
      setAgentId(agentIdParam);
      syncedRef.current = true;
    }
  }, [searchParams, setAgentId, agents, hasActiveConversation]);
};
