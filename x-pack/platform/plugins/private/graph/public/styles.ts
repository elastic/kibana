/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const gphFieldBadgeSizeStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    height: euiTheme.size.l,
    // Subtract 2 for the border
    lineHeight: `calc(${euiTheme.size.l} - 2px)`,
  });

export const gphSidebarHeaderStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    marginTop: euiTheme.size.s,
    color: euiTheme.colors.emptyShade,
    backgroundColor: euiTheme.colors.darkestShade,
    padding: euiTheme.size.xs,
    borderRadius: euiTheme.border.radius.medium,
    marginBottom: euiTheme.size.xs,
  });

export const gphSidebarPanelStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    maxHeight: `calc(${euiTheme.size.l} * 10)`,
    // Invalid property hidden auto;
    overflowY: 'hidden',
  });

export const noUserSelectStyles = css({
  userSelect: 'none',
  // Invalid property value: https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
});
