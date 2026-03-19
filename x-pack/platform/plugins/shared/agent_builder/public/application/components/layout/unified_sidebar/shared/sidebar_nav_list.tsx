/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SidebarNavItem } from '../../../../route_config';

interface SidebarNavListProps {
  items: SidebarNavItem[];
  isActive: (path: string) => boolean;
}

interface NavSection {
  label?: string;
  items: SidebarNavItem[];
}

const groupItemsBySection = (items: SidebarNavItem[]): NavSection[] => {
  const sections: NavSection[] = [];
  const sectionMap = new Map<string, SidebarNavItem[]>();
  const ungrouped: SidebarNavItem[] = [];
  const sectionOrder: string[] = [];

  for (const item of items) {
    if (!item.section) {
      ungrouped.push(item);
    } else {
      if (!sectionMap.has(item.section)) {
        sectionMap.set(item.section, []);
        sectionOrder.push(item.section);
      }
      sectionMap.get(item.section)!.push(item);
    }
  }

  if (ungrouped.length > 0) {
    sections.push({ items: ungrouped });
  }

  for (const label of sectionOrder) {
    sections.push({ label, items: sectionMap.get(label)! });
  }

  return sections;
};

export const SidebarNavList: React.FC<SidebarNavListProps> = ({ items, isActive }) => {
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

  const sections = useMemo(() => groupItemsBySection(items), [items]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {sections.map((section, sectionIndex) => (
        <EuiFlexItem grow={false} key={section.label ?? `ungrouped-${sectionIndex}`}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            {section.label && (
              <EuiFlexItem
                grow={false}
                css={css`
                  padding: 0px ${euiTheme.size.s};
                  font-weight: ${euiTheme.font.weight.medium};
                  color: ${euiTheme.colors.textDisabled};
                `}
              >
                <EuiText size="xs" color="text">
                  {section.label}
                </EuiText>
              </EuiFlexItem>
            )}
            {section.items.map((item) => (
              <EuiFlexItem grow={false} key={item.path}>
                <Link to={item.path} css={isActive(item.path) ? activeLinkStyles : baseLinkStyles}>
                  {item.icon && <EuiIcon type={item.icon} size="s" aria-hidden={true} />}
                  {item.label}
                </Link>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
