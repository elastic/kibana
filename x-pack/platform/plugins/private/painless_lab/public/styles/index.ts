/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSObject } from '@emotion/serialize';
import type { EuiThemeComputed } from '@elastic/eui-theme-common';
import { kibanaFullBodyHeightCss } from '@kbn/core/public';

/**
 * This is a very brittle way of preventing the editor and other content from disappearing
 * behind the bottom bar.
 */
const getBottomBarHeight = (euiTheme: EuiThemeComputed) => `(${euiTheme.size.base} * 3)`;

export const getPainlessLabBottomBarPlaceholderStyles = (
  euiTheme: EuiThemeComputed
): CSSObject => ({
  height: `calc${getBottomBarHeight(euiTheme)}`,
});

export const getPainlessLabLeftPaneStyles = (euiTheme: EuiThemeComputed): CSSObject => ({
  paddingTop: euiTheme.size.m,
  backgroundColor: euiTheme.colors.emptyShade,
});

export const getPainlessLabRightPaneStyles = (euiTheme: EuiThemeComputed): CSSObject => ({
  backgroundColor: euiTheme.colors.emptyShade,
  padding: euiTheme.size.s,
  borderLeft: euiTheme.border.thin,
  height: '100%',
});

export const painlessLabRightPaneTabsStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',

  "[role='tabpanel']": {
    height: '100%',
    overflowY: 'auto',
  },
};

// adding dev tool top bar + bottom bar height to the body offset
// (they're both the same height, hence the x2)
const getBodyOffset = (euiTheme: EuiThemeComputed) => `(${getBottomBarHeight(euiTheme)} * 2)`;

export const getPainlessLabMainContainerStyles = (euiTheme: EuiThemeComputed) =>
  kibanaFullBodyHeightCss(getBodyOffset(euiTheme));

export const painlessLabPanelsContainerStyles: CSSObject = {
  // The panel's container should adopt the height of the main container
  height: '100%',
};
