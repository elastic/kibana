/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface SideCardProps {
  title: string;
  /** Count shown next to the title. */
  count?: number;
  /** Content aligned to the right of the title. */
  action?: React.ReactNode;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/** A titled card of the side panel. */
export const SideCard: React.FC<SideCardProps> = ({
  title,
  count,
  action,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        css={css`
          margin-block-end: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {title}
              {count !== undefined ? (
                <span
                  css={css`
                    margin-inline-start: ${euiTheme.size.s};
                    color: ${euiTheme.colors.textSubdued};
                    font-weight: ${euiTheme.font.weight.regular};
                  `}
                >
                  {count}
                </span>
              ) : null}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
      </EuiFlexGroup>
      {children}
    </EuiPanel>
  );
};
SideCard.displayName = 'SideCard';
