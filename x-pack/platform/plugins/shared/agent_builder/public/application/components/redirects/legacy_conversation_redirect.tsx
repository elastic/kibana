/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Navigate, useNavigate } from 'react-router-dom-v5-compat';

import { useQuery } from '@kbn/react-query';

import { useLastAgentId } from '../../hooks/use_last_agent_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { appPaths } from '../../utils/app_paths';
import { RedirectLoading } from './redirect_loading';

/**
 * Redirects legacy `/conversations/:conversationId` URLs to their agent-scoped
 * equivalent. We defer any fallback navigation that depends on
 * `useLastAgentId()` until the space-settings query has resolved so that
 * restricted users in a configured space are never routed to the plugin-wide
 * `elastic-ai-agent` fallback.
 */
export const LegacyConversationRedirect: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
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
      navigate(
        appPaths.agent.conversations.byId({
          agentId: conversation.agent_id,
          conversationId,
        }),
        { replace: true }
      );
    } else if (isError && conversationId && isLastAgentIdReady) {
      // Only fall back to the resolved "last agent" once we know whether the
      // space has an assignment, otherwise a restricted user would briefly
      // land on `elastic-ai-agent` and see the "Agent has been deleted" error.
      navigate(appPaths.agent.conversations.byId({ agentId: lastAgentId, conversationId }), {
        replace: true,
      });
    }
  }, [conversation, conversationId, isError, isLastAgentIdReady, lastAgentId, navigate]);

  if (isNewConversation) {
    if (!isLastAgentIdReady) {
      return <RedirectLoading />;
    }
    return <Navigate to={appPaths.agent.root({ agentId: lastAgentId })} replace />;
  }

  if (isLoading || !isLastAgentIdReady) {
    return <RedirectLoading />;
  }

  return null;
};
