/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darken, makeHighContrastColor } from '@elastic/eui';
import type { useEuiTheme } from '@elastic/eui';

export const getContrastTextColor = (
  backgroundColor: string,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  isDarkMode: boolean
) => {
  const foregroundColor = isDarkMode ? euiTheme.colors.plainLight : euiTheme.colors.plainDark;

  return makeHighContrastColor(foregroundColor)(backgroundColor);
};

export const getHighlightBorderColor = (
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  isDarkMode: boolean
) => (isDarkMode ? euiTheme.colors.plainLight : euiTheme.colors.plainDark);

export interface InteractivePanelStylesOptions {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  isDarkMode: boolean;
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
  isDarkMode,
  backgroundColor,
  isPopoverOpen,
  minHeight,
  minWidth,
  padding,
  fullSize,
  alignCenter,
  extraStyles,
}: InteractivePanelStylesOptions) => {
  const highlightBorderColor = getHighlightBorderColor(euiTheme, isDarkMode);
  const highlightBoxShadow = isPopoverOpen
    ? `inset 0 0 0 2px ${highlightBorderColor}`
    : 'none !important';

  return {
    backgroundColor,
    margin: '0',
    borderRadius: euiTheme.border.radius.small,
    boxShadow: highlightBoxShadow,
    transform: 'none !important',
    transition: 'background-color 150ms ease-in-out !important',
    '&:hover': {
      backgroundColor: backgroundColor ? darken(backgroundColor, 0.07) : undefined,
      transform: 'none !important',
      boxShadow: highlightBoxShadow,
    },
    '&:focus': {
      transform: 'none !important',
      boxShadow: highlightBoxShadow,
    },
    '&:active': {
      transform: 'none !important',
      boxShadow: highlightBoxShadow,
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
