/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';
import { queryKeys } from '../../query_keys';
import { newConversationId } from '../../utils/new_conversation';
import { useConversationActions } from './use_conversation_actions';
import { useResolveConversationId } from '../../hooks/use_resolve_conversation_id';
import { useSaveLastConversationId } from '../../hooks/use_save_last_conversation_id';

interface EmbeddableConversationsProviderProps extends EmbeddableConversationInternalProps {
  children: React.ReactNode;
}

export const EmbeddableConversationsProvider: React.FC<EmbeddableConversationsProviderProps> = ({
  children,
  coreStart,
  services,
  ...contextProps
}) => {
  // Create a QueryClient per instance to ensure cache isolation between multiple embeddable conversations
  const queryClient = useMemo(() => new QueryClient(), []);

  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  const resolvedConversationId = useResolveConversationId({
    newConversation: contextProps.newConversation,
    conversationId: contextProps.conversationId,
    sessionTag: contextProps.sessionTag,
    agentId: contextProps.agentId,
  });

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const validateAndSetConversationId = useCallback(
    async (id: string) => {
      try {
        const conversation = await services.conversationsService.get({ conversationId: id });
        setConversationId(conversation ? id : undefined);
      } catch {
        setConversationId(undefined);
      }
    },
    [services.conversationsService]
  );

  useEffect(() => {
    if (!resolvedConversationId) {
      setConversationId(undefined);
      return;
    }
    validateAndSetConversationId(resolvedConversationId);
  }, [resolvedConversationId, validateAndSetConversationId]);

  useSaveLastConversationId({
    conversationId,
    sessionTag: contextProps.sessionTag,
    agentId: contextProps.agentId,
  });

  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);

  const onConversationCreated = useCallback(
    ({ conversationId: id }: { conversationId: string }) => {
      // Update conversationId to show the newly created conversation in the UI
      setConversationId(id);
    },
    []
  );

  const onDeleteConversation = useCallback(
    ({ isCurrentConversation }: { isCurrentConversation: boolean }) => {
      if (isCurrentConversation) {
        // For embeddable context, we can't navigate, just reset the conversation ID
        setConversationId(undefined);
      }
    },
    []
  );

  const conversationActions = useConversationActions({
    conversationId,
    queryKey,
    queryClient,
    conversationsService: services.conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  const conversationContextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom: true,
      isEmbeddedContext: true,
      sessionTag: contextProps.sessionTag,
      agentId: contextProps.agentId,
      initialMessage: contextProps.initialMessage,
      setConversationId: (id: string) => {
        setConversationId(id);
      },
      conversationActions,
    }),
    [
      conversationId,
      contextProps.sessionTag,
      contextProps.agentId,
      contextProps.initialMessage,
      conversationActions,
    ]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <OnechatServicesContext.Provider value={services}>
            <ConversationContext.Provider value={conversationContextValue}>
              <SendMessageProvider>{children}</SendMessageProvider>
            </ConversationContext.Provider>
          </OnechatServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
