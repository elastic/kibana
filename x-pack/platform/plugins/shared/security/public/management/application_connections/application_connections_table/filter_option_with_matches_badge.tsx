/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export interface FilterOptionWithMatchesBadgeProps {
  name: string;
  matches: number;
}

const truncateTextStyles = css`
  text-overflow: ellipsis;
  overflow: hidden;
`;

const wrapperStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-block: ${euiTheme.size.xs};
`;

export const FilterOptionWithMatchesBadge: React.FC<FilterOptionWithMatchesBadgeProps> = ({
  name,
  matches,
}) => (
  <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" css={wrapperStyles}>
    <EuiFlexItem>
      <EuiText css={truncateTextStyles} size="s">
        {name}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiNotificationBadge size="m" color="subdued">
        {matches}
      </EuiNotificationBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
