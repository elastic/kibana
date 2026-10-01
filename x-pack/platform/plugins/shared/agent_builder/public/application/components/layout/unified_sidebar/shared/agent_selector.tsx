/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { i18n } from '@kbn/i18n';

import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { storageKeys } from '../../../../storage_keys';
import { useActiveSpaceId } from '../../../../context/active_space_context';
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
  const history = useHistory();
  const spaceId = useActiveSpaceId();
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.getAgentIdKey(spaceId));

  const currentAgentFromList = agents.find((a) => a.id === agentId);
  // If the agent isn't in the visible list (e.g. it's hidden), fetch it directly so the
  // selector still shows its name instead of "(Deleted agent)".
  const { agent: currentAgentById } = useAgentBuilderAgentById(
    !isLoading && !currentAgentFromList ? agentId : undefined
  );
  const currentAgent = currentAgentFromList ?? currentAgentById ?? undefined;

  const handleAgentChange = useCallback(
    (newAgentId: string) => {
      setStoredAgentId(newAgentId);
      history.push(getNavigationPath(newAgentId));
    },
    [history, setStoredAgentId, getNavigationPath]
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
