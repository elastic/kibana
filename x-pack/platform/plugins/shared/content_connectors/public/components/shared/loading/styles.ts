/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { transparentize, type EuiThemeComputed } from '@elastic/eui';

export const enterpriseSearchLoading = (euiTheme: EuiThemeComputed<{}>) => css`
  z-index: ${euiTheme.levels.menu};
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%);
`;

export const enterpriseSearchLoadingOverlay = (euiTheme: EuiThemeComputed<{}>) => css`
  z-index: ${euiTheme.levels.maskBelowHeader};
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: ${transparentize(euiTheme.colors.emptyShade, 0.25)};
`;
