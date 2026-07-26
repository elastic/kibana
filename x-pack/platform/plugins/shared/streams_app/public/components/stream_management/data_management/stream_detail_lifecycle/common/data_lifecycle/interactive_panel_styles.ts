/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darken } from '@elastic/eui';
import type { useEuiTheme } from '@elastic/eui';

export interface InteractivePanelStylesOptions {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  backgroundColor?: string;
  isPopoverOpen: boolean;
  minHeight?: string;
  minWidth?: string;
  padding?: string;
  fullSize?: boolean;
  alignCenter?: boolean;
  extraStyles?: Record<string, string | number>;
}

export const getInteractivePanelStyles = ({
  euiTheme,
  backgroundColor,
  isPopoverOpen,
  minHeight,
  minWidth,
  padding,
  fullSize,
  alignCenter,
  extraStyles,
}: InteractivePanelStylesOptions) => {
  return {
    backgroundColor,
    margin: '0',
    borderRadius: euiTheme.border.radius.small,
    boxShadow: isPopoverOpen ? `inset 0 0 0 2px ${euiTheme.colors.shadow}` : 'none !important',
    transform: 'none !important',
    transition: 'background-color 150ms ease-in-out !important',
    '&:hover': {
      backgroundColor: backgroundColor ? darken(backgroundColor, 0.07) : undefined,
      transform: 'none !important',
      boxShadow: isPopoverOpen ? `inset 0 0 0 2px ${euiTheme.colors.shadow}` : 'none !important',
    },
    '&:focus': {
      transform: 'none !important',
      boxShadow: isPopoverOpen ? `inset 0 0 0 2px ${euiTheme.colors.shadow}` : 'none !important',
    },
    '&:active': {
      transform: 'none !important',
      boxShadow: isPopoverOpen ? `inset 0 0 0 2px ${euiTheme.colors.shadow}` : 'none !important',
    },
    ...(minHeight ? { minHeight } : {}),
    ...(minWidth ? { minWidth } : {}),
    ...(padding ? { padding } : {}),
    ...(fullSize ? { height: '100%', width: '100%' } : {}),
    ...(alignCenter
      ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      : {}),
    ...(extraStyles ?? {}),
  };
};
