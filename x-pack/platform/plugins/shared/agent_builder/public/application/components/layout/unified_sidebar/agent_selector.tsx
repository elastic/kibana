/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import { EuiFlexItem, EuiText, EuiSelect, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { storageKeys } from '../../../storage_keys';

const labels = {
  agentLabel: i18n.translate('xpack.agentBuilder.sidebar.agentSelector.agentLabel', {
    defaultMessage: 'Agent',
  }),
  selectAgent: i18n.translate('xpack.agentBuilder.sidebar.agentSelector.selectAgent', {
    defaultMessage: 'Select agent',
  }),
};

interface AgentSelectorProps {
  agentId: string;
  getNavigationPath: (newAgentId: string) => string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agentId, getNavigationPath }) => {
  const { agents, isLoading } = useAgentBuilderAgents();
  const navigate = useNavigate();
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);

  const handleAgentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newAgentId = e.target.value;
      setStoredAgentId(newAgentId);
      navigate(getNavigationPath(newAgentId));
    },
    [navigate, setStoredAgentId, getNavigationPath]
  );

  const agentOptions = agents.map((agent) => ({
    value: agent.id,
    text: agent.name,
  }));

  return (
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        <strong>{labels.agentLabel}</strong>
      </EuiText>
      {isLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiSelect
          compressed
          options={agentOptions}
          value={agentId}
          onChange={handleAgentChange}
          aria-label={labels.selectAgent}
        />
      )}
    </EuiFlexItem>
  );
};
