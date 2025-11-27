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
import type { Conversation } from '@kbn/onechat-common';
import type {
  EmbeddableConversationInternalProps,
  EmbeddableConversationProps,
} from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';
import { useConversationActions } from './use_conversation_actions';
import { usePersistedConversationId } from '../../hooks/use_persisted_conversation_id';
import { getProcessedAttachments } from './get_processed_attachments';
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

  // Merge current props with any updates, preserving flyout-specific props
  const mergedProps = useMemo(() => {
    return { ...contextProps, ...currentProps };
  }, [contextProps, currentProps]);

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
    sessionTag: mergedProps.sessionTag,
    agentId: mergedProps.agentId,
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
      if (mergedProps.newConversation) {
        // if {newConversation} is initially true, we need to clear it after the conversation is created
        setCurrentProps({ ...mergedProps, newConversation: undefined });
      }
      setConversationId(id);
    },
    [mergedProps, setConversationId]
  );

  const onDeleteConversation = useCallback(() => {
    setConversationId(undefined);
  }, [setConversationId]);

  // Derived conversation ID
  const conversationId = useMemo(() => {
    if (mergedProps.newConversation) {
      return undefined;
    }
    // After initialization, always use persisted ID
    return persistedConversationId;
  }, [mergedProps.newConversation, persistedConversationId]);

  const conversationActions = useConversationActions({
    conversationId,
    queryClient,
    conversationsService: services.conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  const attachmentMapRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const setAttachmentMap = useCallback((attachments: Map<string, Record<string, unknown>>) => {
    attachmentMapRef.current = attachments;
  }, []);

  const handleGetProcessedAttachments = useCallback(
    (_conversation?: Conversation) => {
      return getProcessedAttachments({
        attachments: mergedProps.attachments ?? [],
        getAttachment: (id) => attachmentMapRef.current.get(id),
        setAttachment: (id, content) => attachmentMapRef.current.set(id, content),
      });
    },
    [mergedProps.attachments]
  );

  const conversationContextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom: true,
      isEmbeddedContext: true,
      sessionTag: mergedProps.sessionTag,
      agentId: mergedProps.agentId,
      initialMessage: mergedProps.initialMessage,
      browserApiTools: mergedProps.browserApiTools,
      setConversationId,
      attachments: mergedProps.attachments,
      conversationActions,
      getProcessedAttachments: handleGetProcessedAttachments,
      setAttachmentMap,
    }),
    [
      conversationId,
      mergedProps.sessionTag,
      mergedProps.agentId,
      mergedProps.initialMessage,
      mergedProps.attachments,
      mergedProps.browserApiTools,
      conversationActions,
      handleGetProcessedAttachments,
      setConversationId,
      setAttachmentMap,
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
