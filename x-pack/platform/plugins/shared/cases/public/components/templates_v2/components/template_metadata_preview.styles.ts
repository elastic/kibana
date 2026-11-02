/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const componentStyles = {
  list: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: euiTheme.size.m,
    }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column' as const,
      gap: euiTheme.size.xs,
    }),
  value: css({
    marginInlineStart: 0,
  }),
};
