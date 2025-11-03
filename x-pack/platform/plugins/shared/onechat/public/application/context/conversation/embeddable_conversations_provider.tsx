/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { isEqual } from 'lodash';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';
import { useConversationActions } from './use_conversation_actions';
import { usePersistedConversationId } from '../../hooks/use_persisted_conversation_id';
import { AttachmentMapRebuilder } from './attachment_map_rebuilder';

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

  const attachmentContentMapRef = useRef<Map<string, Record<string, unknown>>>(new Map());

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

  const conversationActions = useConversationActions({
    conversationId: persistedConversationId,
    queryClient,
    conversationsService: services.conversationsService,
    onConversationCreated,
  });

  const getProcessedAttachments = useCallback(async (): Promise<AttachmentInput[]> => {
    if (!contextProps.attachments || contextProps.attachments.length === 0) {
      return [];
    }

    const attachmentsToSend: AttachmentInput[] = [];

    for (const attachment of contextProps.attachments) {
      try {
        const currentContent = await Promise.resolve(attachment.getContent());
        const previousContent = attachmentContentMapRef.current.get(attachment.id);

        const contentChanged = !isEqual(currentContent, previousContent);

        if (contentChanged || !previousContent) {
          attachmentsToSend.push({
            id: attachment.id,
            type: attachment.type,
            data: currentContent,
            hidden: true,
          });

          attachmentContentMapRef.current.set(attachment.id, currentContent);
        }
      } catch (attachmentError) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to fetch content for attachment ${attachment.id}:`, attachmentError);
      }
    }

    return attachmentsToSend;
  }, [contextProps.attachments]);

  const conversationContextValue = useMemo(
    () => ({
      conversationId: persistedConversationId,
      shouldStickToBottom: true,
      isEmbeddedContext: true,
      sessionTag: contextProps.sessionTag,
      agentId: contextProps.agentId,
      initialMessage: contextProps.initialMessage,
      setConversationId,
      attachments: contextProps.attachments,
      conversationActions,
      getProcessedAttachments,
    }),
    [
      persistedConversationId,
      contextProps.sessionTag,
      contextProps.agentId,
      contextProps.initialMessage,
      contextProps.attachments,
      conversationActions,
      getProcessedAttachments,
      setConversationId,
    ]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <OnechatServicesContext.Provider value={services}>
            <ConversationContext.Provider value={conversationContextValue}>
              <SendMessageProvider>
                <AttachmentMapRebuilder attachmentContentMapRef={attachmentContentMapRef}>
                  {children}
                </AttachmentMapRebuilder>
              </SendMessageProvider>
            </ConversationContext.Provider>
          </OnechatServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
