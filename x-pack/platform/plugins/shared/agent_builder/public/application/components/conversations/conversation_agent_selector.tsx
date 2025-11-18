/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useAgentBuilderAgents } from '../../hooks/agents/use_agents';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { AgentSelectDropdown } from './agent_select_dropdown';

interface ConversationAgentSelectorProps {
  agentId?: string;
}

export const ConversationAgentSelector: React.FC<ConversationAgentSelectorProps> = ({
  agentId,
}) => {
  const { agents, isLoading: isLoadingAgents } = useAgentBuilderAgents();
  const hasActiveConversation = useHasActiveConversation();
  const { conversationActions } = useConversationContext();

  const handleAgentChange = (newAgentId: string) => {
    conversationActions.setAgentId(newAgentId);
  };

  if (isLoadingAgents || !agentId) {
    return <EuiLoadingSpinner />;
  }

  const currentAgent = agents.find((agent) => agent.id === agentId);

  return hasActiveConversation ? (
    <EuiText color="subdued" size="s">
      {currentAgent?.name}
    </EuiText>
  ) : (
    <AgentSelectDropdown
      selectedAgent={currentAgent}
      onAgentChange={handleAgentChange}
      agents={agents}
    />
  );
};
