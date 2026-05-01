/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { i18n } from '@kbn/i18n';

import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { storageKeys } from '../../../../storage_keys';
import { AgentSelectorDropdown } from '../../../common/agent_selector/agent_selector_dropdown';

const deletedAgentLabel = i18n.translate('xpack.agentBuilder.sidebar.agentSelector.deletedAgent', {
  defaultMessage: '(Deleted agent)',
});

interface AgentSelectorProps {
  agentId: string;
  getNavigationPath: (newAgentId: string) => string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agentId, getNavigationPath }) => {
  const { agents, isLoading } = useAgentBuilderAgents();
  const navigate = useNavigate();
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);

  const currentAgent = agents.find((a) => a.id === agentId);

  const handleAgentChange = useCallback(
    (newAgentId: string) => {
      setStoredAgentId(newAgentId);
      navigate(getNavigationPath(newAgentId));
    },
    [navigate, setStoredAgentId, getNavigationPath]
  );

  return (
    <AgentSelectorDropdown
      agents={agents}
      selectedAgent={currentAgent}
      onAgentChange={handleAgentChange}
      anchorPosition="downLeft"
      fallbackLabel={!isLoading && !currentAgent ? deletedAgentLabel : undefined}
    />
  );
};
