/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SidebarNavItem } from '../../../../route_config';

interface SidebarNavListProps {
  items: SidebarNavItem[];
  isActive: (path: string) => boolean;
  onItemClick?: () => void;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({ items, isActive, onItemClick }) => {
  const { euiTheme } = useEuiTheme();

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

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="xs">
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.path}>
            <Link
              to={item.path}
              css={isActive(item.path) ? activeLinkStyles : baseLinkStyles}
              onClick={onItemClick}
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
