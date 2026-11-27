/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';

export interface OverviewCardProps {
  title: string;
  iconType?: IconType;
  /** Count shown in a badge next to the title. */
  count?: number;
  /** Content aligned to the right of the title row. */
  action?: React.ReactNode;
  /** Draws attention to the card (used for things waiting on a person). */
  tone?: 'plain' | 'highlight' | 'warning';
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/** A titled card of the Overview tab. */
export const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  iconType,
  count,
  action,
  tone = 'plain',
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      color={tone === 'warning' ? 'warning' : tone === 'highlight' ? 'primary' : 'plain'}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap
        css={css`
          margin-block-end: ${euiTheme.size.s};
        `}
      >
        {iconType ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} aria-hidden="true" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {count !== undefined ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationOverviewCardCount">
              {count}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow />
        {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
      </EuiFlexGroup>
      {children}
    </EuiPanel>
  );
};
OverviewCard.displayName = 'OverviewCard';
