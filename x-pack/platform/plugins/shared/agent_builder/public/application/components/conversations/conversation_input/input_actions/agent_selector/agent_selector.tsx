/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentBuilderAgents } from '../../../../../hooks/agents/use_agents';
import { AgentSelectDropdown } from './agent_select_dropdown';

interface AgentSelectorProps {
  agentId?: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agentId }) => {
  const { agents, isLoading: isLoadingAgents } = useAgentBuilderAgents();
  const { conversationActions } = useConversationContext();

  const handleAgentChange = (newAgentId: string) => {
    conversationActions.setAgentId(newAgentId);
  };

  if (isLoadingAgents || !agentId) {
    return <EuiLoadingSpinner />;
  }

  const currentAgent = agents.find((agent) => agent.id === agentId);

  return (
    <AgentSelectDropdown
      selectedAgent={currentAgent}
      onAgentChange={handleAgentChange}
      agents={agents}
    />
  );
};
