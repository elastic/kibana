/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Shared styles for shard details components
 * Used by: shard_details_tree.tsx, shard_details_tree_node.tsx
 */
export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  // Badge size calculated from the SCSS variable $badgeSize: $euiSize * 5.5
  const badgeSize = `${euiTheme.base * 5.5}px`;

  return {
    // Badge size value for use in individual components
    badgeSize,

    // Table cell base styling (from prfDevTool__profileTree__cell)
    cell: css`
      display: table-cell;
      vertical-align: middle;
      padding: ${euiTheme.size.xs};

      &:first-of-type {
        padding-left: 0;
      }

      &:last-of-type {
        padding-right: 0;
      }
    `,

    // Column width styles (from prfDevTool__profileTree__time, __totalTime, __percentage)
    time: css`
      width: ${badgeSize};
    `,

    totalTime: css`
      width: ${badgeSize};
    `,

    percentage: css`
      width: ${badgeSize};
    `,
  };
};
