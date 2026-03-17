/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@kbn/react-query';
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { newConversationId } from '../../utils/new_conversation';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversationActions } from './use_conversation_actions';
import { queryKeys } from '../../query_keys';

interface RoutedConversationsProviderProps {
  children: React.ReactNode;
}

export const RoutedConversationsProvider: React.FC<RoutedConversationsProviderProps> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const { conversationsService } = useAgentBuilderServices();
  const { conversationId: conversationIdParam, agentId: agentIdParam } = useParams<{
    conversationId?: string;
    agentId?: string;
  }>();

  const conversationId = useMemo(() => {
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  const agentIdFromPath = agentIdParam;

  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;
  const initialMessage = location.state?.initialMessage;

  const { navigateToAgentBuilderUrl } = useNavigation();
  const shouldAllowConversationRedirectRef = useRef(true);

  useEffect(() => {
    return () => {
      // On unmount disable conversation redirect
      shouldAllowConversationRedirectRef.current = false;
    };
  }, []);

  // Clear new conversation cache when agent changes to ensure fresh state
  useEffect(() => {
    if (!conversationId) {
      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
    }
  }, [agentIdFromPath, conversationId, queryClient]);

  const navigateToConversation = useCallback(
    ({ nextConversationId }: { nextConversationId: string }) => {
      // Navigate to the conversation if redirect is allowed
      if (shouldAllowConversationRedirectRef.current && agentIdFromPath) {
        const path = appPaths.agent.conversations.byId({
          agentId: agentIdFromPath,
          conversationId: nextConversationId,
        });
        const state = { shouldStickToBottom: false };
        navigateToAgentBuilderUrl(path, undefined, state);
      }
    },
    [shouldAllowConversationRedirectRef, navigateToAgentBuilderUrl, agentIdFromPath]
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
        // If deleting current conversation, navigate to root (redirects to last used agent)
        navigateToAgentBuilderUrl(appPaths.root, undefined, { shouldStickToBottom: true });
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

  const contextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom,
      isEmbeddedContext: false,
      conversationActions,
      initialMessage,
      autoSendInitialMessage: true,
      agentId: agentIdFromPath,
    }),
    [conversationId, shouldStickToBottom, conversationActions, initialMessage, agentIdFromPath]
  );

  return (
    <ConversationContext.Provider value={contextValue}>{children}</ConversationContext.Provider>
  );
};
