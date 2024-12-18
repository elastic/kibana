/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
export const containerCss = ({ euiTheme }: UseEuiTheme) => ({
  minHeight: `calc(100vh - ${parseFloat(euiTheme.size.xxxl) * 2}px)`,
  background: euiTheme.colors.emptyShade,
  display: 'flex',
  flexDirection: 'column' as const,
});

export const wrapperCss = {
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
};

export const navCss = ({ euiTheme }: UseEuiTheme) => ({
  background: euiTheme.colors.emptyShade,
  borderBottom: euiTheme.border.thin,
  padding: `${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.base} ${euiTheme.size.l}`,
  '.euiTabs': {
    paddingLeft: '3px',
    marginLeft: '-3px',
  },
});
