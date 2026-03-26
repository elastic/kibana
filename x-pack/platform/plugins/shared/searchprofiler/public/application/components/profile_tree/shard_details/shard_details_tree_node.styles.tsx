/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useStyles as useSharedStyles } from './styles';
import { useSharedDetailsStyles } from '../styles';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const sharedStyles = useSharedStyles();

  return {
    // Import shared styles
    ...sharedStyles,

    // Component-specific styles only used in this component
    // Highlighting style for tree row (from prfDevTool__tvRow--last)
    tvRowLast: css`
      cursor: pointer;
    `,

    // Tree row table layout (from prfDevTool__profileTree__tvRow)
    tvRow: css`
      display: table;
      width: 100%;
      table-layout: fixed;
    `,

    // Shard details link styling (from prfDevTool__profileTree__shardDetails)
    shardDetails: useSharedDetailsStyles().shardDetails,

    // Badge styling (from prfDevTool__profileTree__badge)
    badge: css`
      border: none;
      display: block;
    `,

    // Detail styling (from prfDevTool__detail - standalone class)
    detail: css`
      font-size: ${useEuiFontSize('s').fontSize};
      padding-left: calc(${euiTheme.size.l} - 3px); // Alignment is weird (original comment)
      margin-bottom: ${euiTheme.size.s};
      display: flex;
      justify-content: space-between;

      .euiLink {
        flex-shrink: 0;
      }
    `,
  };
};
