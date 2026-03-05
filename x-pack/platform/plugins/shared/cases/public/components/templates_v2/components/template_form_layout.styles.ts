/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const componentStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginTop: `-${euiTheme.size.l}`,
      marginBottom: `-${euiTheme.size.l}`,
      height: '100%',
      overflow: 'hidden',
    }),
  pageTemplate: css({
    flexGrow: 0,
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
      borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  headerSection: css({
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    width: '100%',
  }),
  skeletonTitle: css({
    minWidth: '250px',
    width: '100%',
    display: 'inline-block',
  }),
  title: css({
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
  }),
  titleItem: css({
    minWidth: 0,
    overflow: 'hidden',
  }),
  editorPanel: css({
    height: '100%',
    overflow: 'auto',
  }),
  previewPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      overflow: 'auto',
      padding: euiTheme.size.m,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
