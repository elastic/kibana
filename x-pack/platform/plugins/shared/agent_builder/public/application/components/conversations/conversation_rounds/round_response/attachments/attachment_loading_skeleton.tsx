/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import React, { useRef } from 'react';
=======
import React from 'react';
>>>>>>> 9.4
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSplitPanel,
  useEuiTheme,
<<<<<<< HEAD
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { HEADER_HEIGHT, COMPACT_WIDTH_THRESHOLD } from './attachment_header';
=======
} from '@elastic/eui';
import { css } from '@emotion/react';
import { HEADER_HEIGHT } from './attachment_header';
>>>>>>> 9.4

/**
 * Loading skeleton for an attachment card, shown during streaming before the
 * attachment data is available. Matches the border and header structure of
 * InlineAttachmentWithActions.
 */
export const AttachmentLoadingSkeleton: React.FC = () => {
  const { euiTheme } = useEuiTheme();

<<<<<<< HEAD
  const headerRef = useRef<HTMLDivElement | null>(null);
  const { width: headerWidth } = useResizeObserver(headerRef.current);
  const isCompact = headerWidth > 0 && headerWidth <= COMPACT_WIDTH_THRESHOLD;

  const headerStyles = css`
    min-height: ${isCompact ? 'auto' : `${HEADER_HEIGHT}px`};
=======
  const headerStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: ${HEADER_HEIGHT}px;
>>>>>>> 9.4
  `;

  return (
    <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true}>
<<<<<<< HEAD
      <div ref={headerRef} style={{ width: '100%' }}>
        <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
          <EuiFlexGroup
            responsive={false}
            justifyContent="spaceBetween"
            direction={isCompact ? 'column' : 'row'}
            alignItems={isCompact ? 'flexStart' : 'center'}
            gutterSize={isCompact ? 's' : 'm'}
            style={{ width: '100%' }}
          >
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width="160px" height={euiTheme.size.l} borderRadius="s" />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              style={isCompact ? { alignSelf: 'flex-end' } : { flexShrink: 0 }}
            >
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
      </div>
=======
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
>>>>>>> 9.4
    </EuiSplitPanel.Outer>
  );
};
