/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useQueryClient } from '@kbn/react-query';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { newConversationId } from '../../utils/new_conversation';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useAgentBuilderAgents } from '../../hooks/agents/use_agents';
import { searchParamNames } from '../../search_param_names';
import { useConversationActions } from './use_conversation_actions';
import { upsertAttachmentsIntoList } from './upsert_attachments_into_list';

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

  // Get search params for agent ID syncing
  const [searchParams] = useSearchParams();
  const { agents } = useAgentBuilderAgents();

  const { navigateToAgentBuilderUrl } = useNavigation();
  const shouldAllowConversationRedirectRef = useRef(true);
  const agentIdSyncedRef = useRef(false);

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

  const [attachments, setAttachments] = useState<AttachmentInput[] | undefined>(undefined);

  const conversationActions = useConversationActions({
    conversationId,
    queryClient,
    conversationsService,
    onConversationCreated,
    onDeleteConversation,
  });

  const upsertAttachments = useCallback((nextAttachments: AttachmentInput[]) => {
    if (nextAttachments.length === 0) {
      return;
    }
    setAttachments((prev) => upsertAttachmentsIntoList(prev, nextAttachments));
  }, []);

  const resetAttachments = useCallback(() => {
    setAttachments(undefined);
  }, []);

  const removeAttachment = useCallback((attachmentIndex: number) => {
    setAttachments((prevAttachments) =>
      prevAttachments?.filter((_, index) => index !== attachmentIndex)
    );
  }, []);

  // Handle agent ID syncing from URL params (moved from useSyncAgentId)
  useEffect(() => {
    if (agentIdSyncedRef.current || conversationId) {
      return;
    }

    // If we don't have a selected agent id, check for a valid agent id in the search params
    // This is used for the "chat with agent" action on the Agent pages
    const agentIdParam = searchParams.get(searchParamNames.agentId);

    if (agentIdParam && agents.some((agent) => agent.id === agentIdParam)) {
      // Agent id passed to sync is valid, set it and mark as synced
      conversationActions.setAgentId(agentIdParam);
      agentIdSyncedRef.current = true;
    }
  }, [searchParams, agents, conversationId, conversationActions]);

  const contextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom,
      isEmbeddedContext: false,
      conversationActions,
      initialMessage,
      autoSendInitialMessage: true,
      attachments,
      upsertAttachments,
      resetAttachments,
      removeAttachment,
    }),
    [
      conversationId,
      shouldStickToBottom,
      conversationActions,
      initialMessage,
      attachments,
      upsertAttachments,
      resetAttachments,
      removeAttachment,
    ]
  );

  return (
    <ConversationContext.Provider value={contextValue}>{children}</ConversationContext.Provider>
  );
};
