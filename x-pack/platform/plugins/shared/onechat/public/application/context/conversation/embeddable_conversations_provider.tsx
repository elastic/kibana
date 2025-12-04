/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type {
  EmbeddableConversationInternalProps,
  EmbeddableConversationProps,
} from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';
import { useConversationActions } from './use_conversation_actions';
import { usePersistedConversationId } from '../../hooks/use_persisted_conversation_id';
import { AppLeaveContext } from '../app_leave_context';

const noopOnAppLeave = () => {};
interface EmbeddableConversationsProviderProps extends EmbeddableConversationInternalProps {
  children: React.ReactNode;
}

export const EmbeddableConversationsProvider: React.FC<EmbeddableConversationsProviderProps> = ({
  children,
  coreStart,
  services,
  ...contextProps
}) => {
  // Track current props, starting with initial props
  const [currentProps, setCurrentProps] = useState<EmbeddableConversationProps>(contextProps);

  // Register callback to receive prop updates from parent.
  const onPropsUpdate = contextProps.onPropsUpdate;
  useEffect(() => {
    if (onPropsUpdate) {
      onPropsUpdate((newProps) => {
        setCurrentProps(newProps);
      });
    }
  }, [onPropsUpdate]);

  // Create a QueryClient per instance to ensure cache isolation between multiple embeddable conversations
  const queryClient = useMemo(() => new QueryClient(), []);

  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: {
        ...services.startDependencies,
      },
    }),
    [coreStart, services.startDependencies]
  );

  const { persistedConversationId, updatePersistedConversationId } = usePersistedConversationId({
    sessionTag: currentProps.sessionTag,
    agentId: currentProps.agentId,
  });

  const hasInitializedConversationIdRef = useRef(false);

  const setConversationId = useCallback(
    (id?: string) => {
      if (currentProps.newConversation && id) {
        // reset new conversation flag when there is a valid id
        setCurrentProps({ ...currentProps, newConversation: undefined });
      }
      if (id !== persistedConversationId) {
        updatePersistedConversationId(id);
      }
    },
    [currentProps, persistedConversationId, updatePersistedConversationId]
  );

  const validateAndSetConversationId = useCallback(
    async (id: string) => {
      try {
        const conversation = await services.conversationsService.get({ conversationId: id });
        setConversationId(conversation.id ?? undefined);
      } catch {
        setConversationId(undefined);
      }
    },
    [services.conversationsService, setConversationId]
  );

  // One-time initialization per provider instance:
  // - If newConversation flag is set, clears the conversation ID to start fresh.
  // - Otherwise, if there's a persisted conversation ID, validates and restores it.
  // - Otherwise, clears the conversation ID.
  // Guarded by hasInitializedConversationIdRef to prevent re-running on subsequent renders.
  useEffect(() => {
    if (hasInitializedConversationIdRef.current) return;

    if (contextProps.newConversation) {
      setConversationId(undefined);
    } else if (persistedConversationId) {
      validateAndSetConversationId(persistedConversationId);
    } else {
      setConversationId(undefined);
    }
    hasInitializedConversationIdRef.current = true;
  }, [
    contextProps.newConversation,
    persistedConversationId,
    setConversationId,
    validateAndSetConversationId,
  ]);

  const onConversationCreated = useCallback(
    ({ conversationId: id }: { conversationId: string }) => {
      setConversationId(id);
    },
    [setConversationId]
  );

  const onDeleteConversation = useCallback(() => {
    setConversationId(undefined);
  }, [setConversationId]);

  // Derived conversation ID
  const conversationId = useMemo(() => {
    if (currentProps.newConversation) {
      return undefined;
    }
    // After initialization, always use persisted ID
    return persistedConversationId;
  }, [currentProps, persistedConversationId]);

  const conversationActions = useConversationActions({
    conversationId,
    queryClient,
    conversationsService: services.conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  const resetInitialMessage = useCallback(() => {
    setCurrentProps({ ...currentProps, initialMessage: undefined });
  }, [currentProps, setCurrentProps]);

  const resetAttachments = useCallback(() => {
    setCurrentProps({ ...currentProps, attachments: undefined });
  }, [currentProps]);

  const conversationContextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom: true,
      isEmbeddedContext: true,
      sessionTag: currentProps.sessionTag,
      agentId: currentProps.agentId,
      initialMessage: currentProps.initialMessage,
      resetInitialMessage,
      browserApiTools: currentProps.browserApiTools,
      setConversationId,
      attachments: currentProps.attachments,
      resetAttachments,
      conversationActions,
    }),
    [
      conversationId,
      currentProps.sessionTag,
      currentProps.agentId,
      currentProps.initialMessage,
      currentProps.browserApiTools,
      currentProps.attachments,
      resetInitialMessage,
      setConversationId,
      resetAttachments,
      conversationActions,
    ]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <OnechatServicesContext.Provider value={services}>
            <AppLeaveContext.Provider value={noopOnAppLeave}>
              <ConversationContext.Provider value={conversationContextValue}>
                <SendMessageProvider>{children}</SendMessageProvider>
              </ConversationContext.Provider>
            </AppLeaveContext.Provider>
          </OnechatServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
