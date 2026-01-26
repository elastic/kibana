/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { transparentize, type EuiThemeComputed } from '@elastic/eui';

export const enterpriseSearchLoading = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%)',
    zIndex: euiTheme.levels.menu,
  });

export const enterpriseSearchLoadingOverlay = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    backgroundColor: transparentize(euiTheme.colors.emptyShade, 0.25),
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: euiTheme.levels.maskBelowHeader,
  });
