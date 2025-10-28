/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useOnechatAgents } from '../../hooks/agents/use_agents';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useConversationActions } from '../../hooks/use_conversation_actions';
import { AgentSelectDropdown } from './agent_select_dropdown';

interface ConversationAgentSelectorProps {
  agentId?: string;
}

export const ConversationAgentSelector: React.FC<ConversationAgentSelectorProps> = ({
  agentId,
}) => {
  const { agents, isLoading: isLoadingAgents } = useOnechatAgents();
  const hasActiveConversation = useHasActiveConversation();
  const { setAgentId } = useConversationActions();

  const handleAgentChange = (newAgentId: string) => {
    setAgentId(newAgentId);
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
