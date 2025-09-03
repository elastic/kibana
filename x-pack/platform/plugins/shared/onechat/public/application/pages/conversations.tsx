/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useNavigation } from '../hooks/use_navigation';
import { useConversationList } from '../hooks/use_conversation_list';
import { appPaths } from '../utils/app_paths';
import { OnechatConversationsView } from '../components/conversations/conversations_view';
import { labels } from '../utils/i18n';
import { getMostRecentConversation } from '../utils/get_most_recent_conversation';

export const OnechatConversationsPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { navigateToOnechatUrl } = useNavigation();
  const { conversations, isLoading } = useConversationList();

  useBreadcrumb([
    {
      text: labels.conversations.title,
      path: appPaths.chat.new,
    },
  ]);

  useEffect(() => {
    const shouldRedirect = !conversationId && !isLoading;
    if (shouldRedirect) {
      if (conversations && conversations.length > 0) {
        const mostRecentConversation = getMostRecentConversation(conversations);
        navigateToOnechatUrl(
          appPaths.chat.conversation({ conversationId: mostRecentConversation.id })
        );
      } else {
        navigateToOnechatUrl(appPaths.chat.new);
      }
    }
  }, [conversationId, conversations, isLoading, navigateToOnechatUrl]);

  // Redirecting /conversations to most recent conversation or /new
  if (!conversationId) {
    return null;
  }

  return <OnechatConversationsView />;
};
