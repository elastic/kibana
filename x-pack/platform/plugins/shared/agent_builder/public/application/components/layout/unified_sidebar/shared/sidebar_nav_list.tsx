/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT, AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';

import type { SidebarNavItem } from '../../../../route_config';
import { useKibana } from '../../../../hooks/use_kibana';

interface SidebarNavListProps {
  items: SidebarNavItem[];
  isActive: (path: string) => boolean;
  onItemClick?: () => void;
  layer: 'conversation' | 'manage';
  agentId?: string;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({
  items,
  isActive,
  onItemClick,
  layer,
  agentId,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();

  const baseLinkStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    width: 100%;
    padding: 6px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    text-decoration: none;
    color: ${euiTheme.colors.textParagraph};

    &:hover {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      color: ${euiTheme.colors.textPrimary};
      text-decoration: none;
    }
  `;

  const activeLinkStyles = css`
    ${baseLinkStyles}
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    color: ${euiTheme.colors.textPrimary};
  `;

  const handleNavClick = useCallback(
    (item: SidebarNavItem) => {
      const navItem = item.path.split('/').filter(Boolean).pop() ?? item.path;
      analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.SidebarNavigationClick, {
        layer,
        item: navItem,
        ...(agentId ? { agent_id: agentId } : {}),
      });
      onItemClick?.();
    },
    [analytics, layer, agentId, onItemClick]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="xs">
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.path}>
            <Link
              to={item.path}
              css={isActive(item.path) ? activeLinkStyles : baseLinkStyles}
              onClick={() => handleNavClick(item)}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.SIDEBAR,
                action: AGENT_BUILDER_UI_EBT.action.navSidebar.SIDEBAR_NAVIGATION_CLICK,
                detail: item.path.split('/').filter(Boolean).pop() ?? item.path,
              })}
            >
              {item.icon && <EuiIcon type={item.icon} size="s" aria-hidden={true} />}
              {item.label}
            </Link>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
