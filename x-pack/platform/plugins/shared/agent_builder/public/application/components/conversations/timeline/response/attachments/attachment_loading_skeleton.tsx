/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSplitPanel,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AttachmentCard, ATTACHMENT_INNER_RADIUS } from './attachment_card';
import { INLINE_HEADER_HEIGHT, COMPACT_WIDTH_THRESHOLD } from './attachment_header';

/** Width of a typical header split button, so the skeleton matches the loaded header. */
const SPLIT_BUTTON_SKELETON_WIDTH = '137px';

/**
 * Loading skeleton for an attachment card, shown during streaming before the
 * attachment data is available. Matches the border and header structure of
 * InlineAttachmentWithActions.
 */
export const AttachmentLoadingSkeleton: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const [measureElement, setMeasureElement] = useState<HTMLDivElement | null>(null);
  const { width: headerWidth } = useResizeObserver(measureElement);
  const isCompact = headerWidth > 0 && headerWidth <= COMPACT_WIDTH_THRESHOLD;

  const headerStyles = css`
    display: flex;
    align-items: center;
    border-radius: ${ATTACHMENT_INNER_RADIUS}px;
    min-height: ${isCompact ? 'auto' : `${INLINE_HEADER_HEIGHT}px`};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} ${euiTheme.size.base};
  `;

  return (
    <AttachmentCard>
      <div ref={setMeasureElement} style={{ width: '100%' }}>
        <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="none">
          <EuiFlexGroup
            responsive={false}
            justifyContent="spaceBetween"
            direction={isCompact ? 'column' : 'row'}
            alignItems={isCompact ? 'flexStart' : 'center'}
            gutterSize={isCompact ? 's' : 'm'}
            style={{ width: '100%' }}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle
                    width={euiTheme.size.base}
                    height={euiTheme.size.base}
                    borderRadius="s"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle
                    width="160px"
                    height={euiTheme.size.base}
                    borderRadius="s"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              style={isCompact ? { alignSelf: 'flex-end' } : { flexShrink: 0 }}
            >
              <EuiSkeletonRectangle
                width={SPLIT_BUTTON_SKELETON_WIDTH}
                height={euiTheme.size.xl}
                borderRadius="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </div>
    </AttachmentCard>
  );
};
