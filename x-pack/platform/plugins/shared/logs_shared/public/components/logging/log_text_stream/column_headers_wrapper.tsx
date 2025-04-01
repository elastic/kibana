/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { ASSUMED_SCROLLBAR_WIDTH } from './vertical_scroll_panel';

export const LogColumnHeadersWrapper = ({ role = 'row', ...props }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      role={role}
      css={css`
        align-items: stretch;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        overflow: hidden;
        padding-right: ${ASSUMED_SCROLLBAR_WIDTH}px;
        border-bottom: ${euiTheme.border.thin};
        box-shadow: 0 2px 2px -1px ${euiTheme.colors.borderBaseSubdued};
        position: relative;
        z-index: 1;
      `}
      {...props}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default LogColumnHeadersWrapper;
