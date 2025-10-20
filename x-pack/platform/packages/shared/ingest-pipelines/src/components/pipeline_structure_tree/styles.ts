/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const getStyles = (euiTheme: EuiThemeComputed) => css`
  [class*='cssTreeNode-'] {
    background-color: ${euiTheme.colors.backgroundBasePlain};
    padding: ${euiTheme.size.base} ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    margin: ${euiTheme.size.base} 0;
  }

  [class*='cssTreeNode-']:hover {
    background-color: ${euiTheme.colors.backgroundTransparentPrimary};
  }

  [class*='cssTreeNode-level'] {
    margin-left: ${euiTheme.size.xl};
    width: calc(100% - ${euiTheme.size.xl});
  }

  // We want to disable EUI's logic for activating nodes but EuiTreeViewItems's
  // isActive prop is not working correctly so we temporarily overwrite its active class
  .euiTreeView__node--active {
    background-color: ${euiTheme.colors.backgroundBasePlain} !important;
  }

  .cssTreeNode-root--active,
  .cssTreeNode-children--active {
    background-color: ${euiTheme.colors.backgroundLightPrimary} !important;
    border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePrimary};
  }

  .cssTreeNode-morePipelines {
    margin-left: ${euiTheme.size.xl};
    width: calc(100% - ${euiTheme.size.xl});
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    color: ${euiTheme.colors.textPrimary} !important;
    border: none;
  }
`;
