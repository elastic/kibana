/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const getStyles = (euiTheme: EuiThemeComputed, isExtension: boolean) => css`
  [class*='cssTreeNode-'] {
    background-color: ${euiTheme.colors.backgroundBasePlain};
    padding: ${euiTheme.size.s};
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    width: 100%;
    margin: ${euiTheme.size.xs} 0;
    height: 40px;
    display: flex;
    align-items: center;
  }

  [class*='cssTreeNode-']:hover {
    background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
    text-decoration: underline;
  }

  [class*='cssTreeNode-children'] {
    margin-left: ${isExtension ? euiTheme.size.xl : euiTheme.size.xxl};
  }

  // We want to disable EUI's logic for activating nodes but EuiTreeViewItems's
  // isActive prop is not working correctly so we temporarily overwrite its active class
  .euiTreeView__node--active {
    background-color: ${euiTheme.colors.backgroundBasePlain} !important;
  }

  .cssTreeNode-root--active,
  .cssTreeNode-children--active {
    background-color: ${euiTheme.colors.backgroundBasePrimary} !important;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderStrongPrimary};
  }

  .cssTreeNode-morePipelines {
    margin-left: ${euiTheme.size.base};
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    color: ${euiTheme.colors.textPrimary} !important;
    border: none;
  }
`;
