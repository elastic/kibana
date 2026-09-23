/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';

import { useQuery } from '@kbn/react-query';

import { useLastAgentId } from '../../hooks/use_last_agent_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { appPaths } from '../../utils/app_paths';
import { RedirectLoading } from './redirect_loading';

export const LegacyConversationRedirect: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const history = useHistory();
  const { agentId: lastAgentId, isReady: isLastAgentIdReady } = useLastAgentId();

  const { conversationsService } = useAgentBuilderServices();

  const isNewConversation = !conversationId || conversationId === 'new';

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversation-redirect', conversationId],
    queryFn: () => conversationsService.get({ conversationId: conversationId! }),
    enabled: !isNewConversation,
    retry: false,
  });

  useEffect(() => {
    if (conversation?.agent_id && conversationId) {
      history.replace(
        appPaths.agent.conversations.byId({
          agentId: conversation.agent_id,
          conversationId,
        })
      );
    } else if (isError && conversationId) {
      history.replace(appPaths.agent.conversations.byId({ agentId: lastAgentId, conversationId }));
    }
  }, [conversation, conversationId, isError, lastAgentId, history]);

  if (isNewConversation) {
    return <Redirect to={appPaths.agent.root({ agentId: lastAgentId })} />;
  }

  if (isLoading || !isLastAgentIdReady) {
    return <RedirectLoading />;
  }

  return null;
};
