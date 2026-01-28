/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useQueryClient } from '@kbn/react-query';
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { newConversationId } from '../../utils/new_conversation';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useAgentBuilderAgents } from '../../hooks/agents/use_agents';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { searchParamNames } from '../../search_param_names';
import { useConversationActions } from './use_conversation_actions';

interface RoutedConversationsProviderProps {
  children: React.ReactNode;
}

export const RoutedConversationsProvider: React.FC<RoutedConversationsProviderProps> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const { conversationsService } = useAgentBuilderServices();
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();

  const conversationId = useMemo(() => {
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;
  const initialMessage = location.state?.initialMessage;
  const agentIdFromState = location.state?.agentId;
  const connectorIdFromState = location.state?.connectorId;

  // Get search params for agent ID syncing
  const [searchParams] = useSearchParams();
  const { agents } = useAgentBuilderAgents();

  const { navigateToAgentBuilderUrl } = useNavigation();
  const { selectConnector } = useConnectorSelection();
  const shouldAllowConversationRedirectRef = useRef(true);
  const agentIdSyncedRef = useRef(false);
  const connectorIdSyncedRef = useRef(false);

  useEffect(() => {
    return () => {
      // On unmount disable conversation redirect
      shouldAllowConversationRedirectRef.current = false;
    };
  }, []);

  const navigateToConversation = useCallback(
    ({ nextConversationId }: { nextConversationId: string }) => {
      // Navigate to the conversation if redirect is allowed
      if (shouldAllowConversationRedirectRef.current) {
        const path = appPaths.chat.conversation({ conversationId: nextConversationId });
        const params = undefined;
        const state = { shouldStickToBottom: false };
        navigateToAgentBuilderUrl(path, params, state);
      }
    },
    [shouldAllowConversationRedirectRef, navigateToAgentBuilderUrl]
  );

  const onConversationCreated = useCallback(
    ({ conversationId: id }: { conversationId: string }) => {
      navigateToConversation({ nextConversationId: id });
    },
    [navigateToConversation]
  );

  const onDeleteConversation = useCallback(
    ({ isCurrentConversation }: { isCurrentConversation: boolean }) => {
      if (isCurrentConversation) {
        // If deleting current conversation, navigate to new conversation
        const path = appPaths.chat.new;
        navigateToAgentBuilderUrl(path, undefined, { shouldStickToBottom: true });
      }
    },
    [navigateToAgentBuilderUrl]
  );

  const conversationActions = useConversationActions({
    conversationId,
    queryClient,
    conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  // Get agent ID directly from state/params
  const agentIdFromParams = agentIdFromState || searchParams.get(searchParamNames.agentId);
  const isAgentIdValid =
    agentIdFromParams && agents.some((agent) => agent.id === agentIdFromParams);

  // Sync agent ID to conversation actions (for persistence in localStorage)
  useEffect(() => {
    if (agentIdSyncedRef.current || conversationId || !isAgentIdValid) {
      return;
    }

    conversationActions.setAgentId(agentIdFromParams);
    agentIdSyncedRef.current = true;
  }, [agentIdFromParams, isAgentIdValid, conversationId, conversationActions]);

  // Get connector ID from state/params and sync to localStorage
  const connectorIdFromParams = connectorIdFromState || searchParams.get(searchParamNames.sourceId);

  useEffect(() => {
    if (connectorIdSyncedRef.current || conversationId || !connectorIdFromParams) {
      return;
    }

    selectConnector(connectorIdFromParams);
    connectorIdSyncedRef.current = true;
  }, [connectorIdFromParams, conversationId, selectConnector]);

  const contextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom,
      isEmbeddedContext: false,
      conversationActions,
      initialMessage,
      autoSendInitialMessage: true,
      agentId: isAgentIdValid ? agentIdFromParams : undefined,
    }),
    [
      conversationId,
      shouldStickToBottom,
      conversationActions,
      initialMessage,
      isAgentIdValid,
      agentIdFromParams,
    ]
  );

  return (
    <ConversationContext.Provider value={contextValue}>{children}</ConversationContext.Provider>
  );
};
