/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiNotificationBadge, EuiText, useEuiTheme } from '@elastic/eui';
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

export const FilterOptionWithMatchesBadge: React.FC<FilterOptionWithMatchesBadgeProps> = ({
  name,
  matches,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        margin-block: ${euiTheme.size.xs};
        gap: ${euiTheme.size.xs};
        width: 100%;
      `}
    >
      <EuiText css={truncateTextStyles} size="s">
        {name}
      </EuiText>
      <EuiFlexItem
        grow={false}
        css={css`
          justify-content: center;
        `}
      >
        <EuiNotificationBadge size="m" color="subdued">
          {matches}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </div>
  );
};
