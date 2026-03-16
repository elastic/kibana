/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { appPaths } from '../../../../utils/app_paths';
import { useLastAgentId } from '../../../../hooks/use_last_agent_id';
import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';
import { getManageNavItems } from '../../../../route_config';

const labels = {
  back: i18n.translate('xpack.agentBuilder.sidebar.manage.back', {
    defaultMessage: '← Back',
  }),
  title: i18n.translate('xpack.agentBuilder.sidebar.manage.title', {
    defaultMessage: 'Manage Components',
  }),
};

interface ManageSidebarViewProps {
  pathname: string;
}

export const ManageSidebarView: React.FC<ManageSidebarViewProps> = ({ pathname }) => {
  const lastAgentId = useLastAgentId();
  const { euiTheme } = useEuiTheme();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();

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

  const isActive = (path: string) => pathname.startsWith(path);

  const navItems = useMemo(() => {
    return getManageNavItems().filter((item) => {
      if (item.isExperimental && !isExperimentalFeaturesEnabled) {
        return false;
      }
      return true;
    });
  }, [isExperimentalFeaturesEnabled]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <Link to={appPaths.agent.root({ agentId: lastAgentId })} css={linkStyles}>
          <EuiText size="s">{labels.back}</EuiText>
        </Link>
      </EuiFlexItem>

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
