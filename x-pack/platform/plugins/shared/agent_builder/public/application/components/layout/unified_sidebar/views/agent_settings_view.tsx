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

interface AgentSettingsSidebarViewProps {
  pathname: string;
}

export const AgentSettingsSidebarView: React.FC<AgentSettingsSidebarViewProps> = ({ pathname }) => {
  const agentId = getAgentIdFromPath(pathname) ?? 'elastic-ai-agent';

  const linkStyles = css`
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `;

  const activeLinkStyles = css`
    ${linkStyles}
    font-weight: bold;
  `;

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { label: 'Instructions', path: appPaths.agent.instructions({ agentId }) },
    { label: 'Skills', path: appPaths.agent.skills({ agentId }) },
    { label: 'Tools', path: appPaths.agent.tools({ agentId }) },
    { label: 'Plugins', path: appPaths.agent.plugins({ agentId }) },
    { label: 'Connectors', path: appPaths.agent.connectors({ agentId }) },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.root({ agentId })} css={linkStyles}>
          <EuiText size="s">← Back</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>Agent Settings</strong>
        </EuiText>
      </EuiFlexItem>

      {navItems.map((item) => (
        <EuiFlexItem grow={false} key={item.path}>
          <Link to={item.path} css={isActive(item.path) ? activeLinkStyles : linkStyles}>
            <EuiText size="s">{item.label}</EuiText>
          </Link>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
