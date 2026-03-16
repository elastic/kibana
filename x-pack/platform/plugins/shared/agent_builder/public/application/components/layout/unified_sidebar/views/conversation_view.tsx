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
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath } from '../get_sidebar_view';
import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { storageKeys } from '../../../../storage_keys';

const labels = {
  agentLabel: i18n.translate('xpack.agentBuilder.sidebar.conversation.agentLabel', {
    defaultMessage: 'Agent',
  }),
  selectAgent: i18n.translate('xpack.agentBuilder.sidebar.conversation.selectAgent', {
    defaultMessage: 'Select agent',
  }),
  customize: i18n.translate('xpack.agentBuilder.sidebar.conversation.customize', {
    defaultMessage: 'Customize',
  }),
  conversationsTitle: i18n.translate('xpack.agentBuilder.sidebar.conversation.conversationsTitle', {
    defaultMessage: 'Conversations',
  }),
  newConversation: i18n.translate('xpack.agentBuilder.sidebar.conversation.newConversation', {
    defaultMessage: '+ New conversation',
  }),
  manageComponents: i18n.translate('xpack.agentBuilder.sidebar.conversation.manageComponents', {
    defaultMessage: 'Manage components',
  }),
};

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

      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.skills({ agentId })} css={linkStyles}>
          <EuiText size="s">{labels.customize}</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>{labels.conversationsTitle}</strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.root({ agentId })} css={linkStyles}>
          <EuiText size="s">{labels.newConversation}</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <Link to={appPaths.manage.agents} css={linkStyles}>
          <EuiText size="s">{labels.manageComponents}</EuiText>
        </Link>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
