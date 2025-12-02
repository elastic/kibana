/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
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
    sessionTag: contextProps.sessionTag,
    agentId: contextProps.agentId,
  });

  const hasInitializedConversationIdRef = useRef(false);

  const setConversationId = useCallback(
    (id?: string) => {
      if (id !== persistedConversationId) {
        updatePersistedConversationId(id);
      }
    },
    [persistedConversationId, updatePersistedConversationId]
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

  const conversationActions = useConversationActions({
    conversationId: persistedConversationId,
    queryClient,
    conversationsService: services.conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  // Track which attachments have been sent (to hide them from input after sending)
  const [sentAttachmentIds, setSentAttachmentIds] = useState<Set<string>>(new Set());

  const markAttachmentsAsSent = useCallback((attachmentIds: string[]) => {
    if (attachmentIds.length > 0) {
      setSentAttachmentIds((prev) => new Set([...prev, ...attachmentIds]));
    }
  }, []);

  // Filter out sent attachments for display in input
  const pendingAttachments = useMemo(() => {
    if (!contextProps.attachments) return [];
    return contextProps.attachments.filter((att) => !sentAttachmentIds.has(att.id));
  }, [contextProps.attachments, sentAttachmentIds]);

  const conversationContextValue = useMemo(
    () => ({
      conversationId: persistedConversationId,
      shouldStickToBottom: true,
      isEmbeddedContext: true,
      sessionTag: contextProps.sessionTag,
      agentId: contextProps.agentId,
      initialMessage: contextProps.initialMessage,
      browserApiTools: contextProps.browserApiTools,
      setConversationId,
      attachments: pendingAttachments,
      markAttachmentsAsSent,
      conversationActions,
    }),
    [
      persistedConversationId,
      contextProps.sessionTag,
      contextProps.agentId,
      contextProps.initialMessage,
      pendingAttachments,
      contextProps.browserApiTools,
      conversationActions,
      markAttachmentsAsSent,
      setConversationId,
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
