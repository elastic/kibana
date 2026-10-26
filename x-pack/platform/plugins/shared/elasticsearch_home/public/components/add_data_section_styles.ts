/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

// Replaces the shadow lift that `EuiPanel` applies to clickable panels with a primary border and
// text color on hover.
export const addDataCard = ({ euiTheme }: UseEuiTheme) => css`
  &:hover {
    box-shadow: none;
    color: ${euiTheme.colors.textPrimary};
    &,
    &::after {
      border-color: ${euiTheme.colors.primary};
    }
  }
`;
