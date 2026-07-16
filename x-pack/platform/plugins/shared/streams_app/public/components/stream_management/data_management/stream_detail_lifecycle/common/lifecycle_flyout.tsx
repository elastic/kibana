/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface LifecycleFlyoutProps
  extends Pick<
    EuiFlyoutProps,
    'onClose' | 'size' | 'type' | 'ownFocus' | 'paddingSize' | 'aria-labelledby'
  > {
  titleId: string;
  title: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

export const LifecycleFlyout = ({
  titleId,
  title,
  headerContent,
  children,
  ownFocus,
  paddingSize,
  ...flyoutProps
}: LifecycleFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const headerPadding = headerContent ? euiTheme.size.l : euiTheme.size.xl;
  const headerStyles = css`
    padding: ${headerPadding};
  `;

  return (
    <EuiFlyout
      size={400}
      type="push"
      ownFocus={ownFocus}
      paddingSize={paddingSize}
      aria-labelledby={titleId}
      role="region"
      {...flyoutProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false} css={headerStyles}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {headerContent && <EuiFlexItem grow={false}>{headerContent}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {children}
    </EuiFlyout>
  );
};
