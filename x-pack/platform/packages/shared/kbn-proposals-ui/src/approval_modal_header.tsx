/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalHeader,
  EuiSpacer,
  EuiTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  ProposedActionStatusBadge,
  type ProposedActionStatusBadgeProps,
} from './needs_review_badge';

interface ApprovalModalHeaderProps {
  /**
   * Badge color/icon/label/loading. Omitted for the default "Needs review" pending state — see
   * {@link ProposedActionStatusBadge}'s own defaults.
   */
  badge?: ProposedActionStatusBadgeProps;
  /** Category/reversibility line, or the decider's name and time once decided/deciding. */
  caption?: React.ReactNode;
  title: string;
  titleId: string;
}

export const ApprovalModalHeader = memo<ApprovalModalHeaderProps>(
  ({ badge, caption, title, titleId }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiModalHeader
        css={css({
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: euiTheme.size.base,
        })}
      >
        <EuiTitle id={titleId} size="s">
          <p>{title}</p>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <ProposedActionStatusBadge {...badge} />
          </EuiFlexItem>
          {caption && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {caption}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalHeader>
    );
  }
);

ApprovalModalHeader.displayName = 'ApprovalModalHeader';
