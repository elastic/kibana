/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@kbn/react-query';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversationActions } from './use_conversation_actions';
import { upsertAttachmentsIntoList } from './upsert_attachments_into_list';
import { ConversationChangeNotifier } from './conversation_change_notifier';

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
    return conversationIdParam === 'new' ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  const agentIdFromPath = agentIdParam;

  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;
  const initialMessage = location.state?.initialMessage;

  const { navigateToAgentBuilderUrl } = useNavigation();

  const onDeleteConversation = useCallback(
    ({ isCurrentConversation }: { isCurrentConversation: boolean }) => {
      if (isCurrentConversation) {
        // If deleting current conversation, navigate to root (redirects to last used agent)
        navigateToAgentBuilderUrl(appPaths.root, undefined, { shouldStickToBottom: true });
      }
    },
    [navigateToAgentBuilderUrl]
  );

  const [attachments, setAttachments] = useState<AttachmentInput[] | undefined>(
    () => location.state?.initialAttachments
  );

  /*
   * One-shot seed of attachments from `location.state.initialAttachments`.
   *
   * The `useState` initializer above primes the very first render with
   * the deep-linked attachments. This effect handles the case where the
   * provider mounts before `location.state` is ready (rare with the
   * React Router types but possible during transitions). It only runs
   * once and only when there are no attachments yet — subsequent
   * `upsertAttachments` calls from the user (drag-and-drop, paperclip,
   * etc.) are preserved.
   */
  const seededRef = useRef(Boolean(location.state?.initialAttachments));
  useEffect(() => {
    if (seededRef.current) return;
    const initial = location.state?.initialAttachments;
    if (initial && initial.length > 0) {
      setAttachments(initial);
      seededRef.current = true;
    }
  }, [location.state]);

  const conversationActions = useConversationActions({
    conversationId,
    queryClient,
    conversationsService,
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

  const contextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom,
      isEmbeddedContext: false,
      conversationActions,
      initialMessage,
      autoSendInitialMessage: true,
      agentId: agentIdFromPath,
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
      agentIdFromPath,
      attachments,
      upsertAttachments,
      resetAttachments,
      removeAttachment,
    ]
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      <ConversationChangeNotifier />
      {children}
    </ConversationContext.Provider>
  );
};
