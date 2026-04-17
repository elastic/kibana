/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Navigate, useNavigate } from 'react-router-dom-v5-compat';

import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';

import { useLastAgentId } from '../../hooks/use_last_agent_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { appPaths } from '../../utils/app_paths';
import { newConversationId } from '../../utils/new_conversation';

export const LegacyConversationRedirect: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const lastAgentId = useLastAgentId();
  const { conversationsService } = useAgentBuilderServices();

  const isNewConversation = !conversationId || conversationId === newConversationId;

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
    } else if (isError && conversationId) {
      navigate(appPaths.agent.conversations.byId({ agentId: lastAgentId, conversationId }), {
        replace: true,
      });
    }
  }, [conversation, conversationId, isError, lastAgentId, navigate]);

  if (isNewConversation) {
    return <Navigate to={appPaths.agent.root({ agentId: lastAgentId })} replace />;
  }

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
};
