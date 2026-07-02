/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { CART_RAIL_POPOVER_MAX_HEIGHT } from './cart_rail.constants';

export interface CartRailPanelProps {
  children: React.ReactNode;
  /** When true, panel is shown in a popover instead of push layout. */
  isPopoverMode?: boolean;
  'data-test-subj'?: string;
}

export const CartRailPanel: React.FC<CartRailPanelProps> = ({
  children,
  isPopoverMode = false,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  const panelStyles = css`
    width: 100%;
    height: 100%;
    max-height: ${isPopoverMode ? CART_RAIL_POPOVER_MAX_HEIGHT : 'none'};
    border-radius: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    ${!isPopoverMode
      ? css`
          flex-shrink: 0;
          border-left: ${euiTheme.border.thin};
          border-color: ${euiTheme.colors.borderBaseSubdued};
        `
      : undefined}
  `;

  return (
    <EuiPanel
      css={panelStyles}
      paddingSize="none"
      hasShadow={false}
      hasBorder={false}
      data-test-subj={dataTestSubj}
    >
      {children}
    </EuiPanel>
  );
};
