/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath } from '../../../../route_config';
import { AgentSelector } from '../agent_selector';

const labels = {
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

  const linkStyles = css`
    text-decoration: none;
    color: inherit;
    &:hover {
      text-decoration: underline;
    }
  `;

  const getNavigationPath = useCallback(
    (newAgentId: string) => appPaths.agent.root({ agentId: newAgentId }),
    []
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <AgentSelector agentId={agentId} getNavigationPath={getNavigationPath} />

      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.instructions({ agentId })} css={linkStyles}>
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
