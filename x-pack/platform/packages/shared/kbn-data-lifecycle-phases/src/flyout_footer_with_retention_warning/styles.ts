/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export type EuiTheme = EuiThemeComputed;

export const getFlyoutFooterWithRetentionWarningStyles = ({ euiTheme }: { euiTheme: EuiTheme }) => {
  const padding = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  return {
    padding,
    callout: css`
      ${padding};
      border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    `,
  };
};
