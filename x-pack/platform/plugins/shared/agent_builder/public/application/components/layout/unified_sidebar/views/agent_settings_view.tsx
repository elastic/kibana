/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath, getAgentSettingsNavItems } from '../../../../route_config';
import { AgentSelector } from '../agent_selector';

const labels = {
  back: i18n.translate('xpack.agentBuilder.sidebar.agentSettings.back', {
    defaultMessage: '← Back',
  }),
  title: i18n.translate('xpack.agentBuilder.sidebar.agentSettings.title', {
    defaultMessage: 'Agent Settings',
  }),
};

interface AgentSettingsSidebarViewProps {
  pathname: string;
}

export const AgentSettingsSidebarView: React.FC<AgentSettingsSidebarViewProps> = ({ pathname }) => {
  const agentId = getAgentIdFromPath(pathname) ?? 'elastic-ai-agent';
  const { euiTheme } = useEuiTheme();

  const linkStyles = css`
    text-decoration: none;
    color: inherit;
    &:hover {
      text-decoration: underline;
    }
  `;

  const activeLinkStyles = css`
    ${linkStyles}
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.primaryText};
  `;

  const getNavigationPath = useCallback(
    (newAgentId: string) => pathname.replace(`/agents/${agentId}`, `/agents/${newAgentId}`),
    [pathname, agentId]
  );

  const navItems = useMemo(() => {
    return getAgentSettingsNavItems(agentId);
  }, [agentId]);

  const isActive = (path: string) => pathname === path;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.root({ agentId })} css={linkStyles}>
          <EuiText size="s">{labels.back}</EuiText>
        </Link>
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <AgentSelector agentId={agentId} getNavigationPath={getNavigationPath} />

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>{labels.title}</strong>
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
