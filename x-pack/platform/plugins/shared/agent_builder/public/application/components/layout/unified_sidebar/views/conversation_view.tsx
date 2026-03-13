/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Link } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath } from '../get_sidebar_view';

interface ConversationSidebarViewProps {
  pathname: string;
}

export const ConversationSidebarView: React.FC<ConversationSidebarViewProps> = ({ pathname }) => {
  const agentId = getAgentIdFromPath(pathname) ?? 'elastic-ai-agent';

  const linkStyles = css`
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>Agent</strong>
        </EuiText>
        <EuiText size="s">{agentId}</EuiText>
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
        <Link to={appPaths.agent.conversations.new({ agentId })} css={linkStyles}>
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
