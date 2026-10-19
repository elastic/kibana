/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TanStackCellPopoverProps } from './types';

const popoverContentStyles = css({
  maxInlineSize: 'min(75vw, 600px)',
  maxBlockSize: '50vh',
  overflow: 'auto',
  wordBreak: 'break-word',
});

/** The default popover content: the cell value followed by the cell actions. */
export const DefaultCellPopover = ({ children, cellActions }: TanStackCellPopoverProps) => (
  <>
    <EuiText size="s" css={popoverContentStyles}>
      {children}
    </EuiText>
    {cellActions}
  </>
);
