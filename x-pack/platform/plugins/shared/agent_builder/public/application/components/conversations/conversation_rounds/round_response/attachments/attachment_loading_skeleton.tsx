/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSplitPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { HEADER_HEIGHT } from './attachment_header';

/**
 * Loading skeleton for an attachment card, shown during streaming before the
 * attachment data is available. Matches the border and header structure of
 * InlineAttachmentWithActions.
 */
export const AttachmentLoadingSkeleton: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const headerStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: ${HEADER_HEIGHT}px;
  `;

  return (
    <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSkeletonRectangle width="160px" height={euiTheme.size.l} borderRadius="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSkeletonRectangle
                  width={euiTheme.size.xxl}
                  height={euiTheme.size.xxl}
                  borderRadius="m"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSkeletonRectangle
                  width={euiTheme.size.xxl}
                  height={euiTheme.size.xxl}
                  borderRadius="m"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
