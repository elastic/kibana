/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom-v5-compat';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiSelect,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath } from '../get_sidebar_view';
import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { storageKeys } from '../../../../storage_keys';

interface ConversationSidebarViewProps {
  pathname: string;
}

export const ConversationSidebarView: React.FC<ConversationSidebarViewProps> = ({ pathname }) => {
  const agentId = getAgentIdFromPath(pathname) ?? 'elastic-ai-agent';
  const { agents, isLoading } = useAgentBuilderAgents();
  const navigate = useNavigate();
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);

  const linkStyles = css`
    text-decoration: none;
    color: inherit;
    &:hover {
      text-decoration: underline;
    }
  `;

  const handleAgentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newAgentId = e.target.value;
      setStoredAgentId(newAgentId);
      navigate(appPaths.agent.root({ agentId: newAgentId }));
    },
    [navigate, setStoredAgentId]
  );

  const agentOptions = agents.map((agent) => ({
    value: agent.id,
    text: agent.name,
  }));

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>Agent</strong>
        </EuiText>
        {isLoading ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiSelect
            compressed
            options={agentOptions}
            value={agentId}
            onChange={handleAgentChange}
            aria-label="Select agent"
          />
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.skills({ agentId })} css={linkStyles}>
          <EuiText size="s">Customize</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>Conversations</strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.root({ agentId })} css={linkStyles}>
          <EuiText size="s">+ New conversation</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <Link to={appPaths.manage.agents} css={linkStyles}>
          <EuiText size="s">Manage components</EuiText>
        </Link>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
