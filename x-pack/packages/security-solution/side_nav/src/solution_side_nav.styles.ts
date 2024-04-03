/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

export const SolutionSideNavItemStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  * {
    // EuiListGroupItem changes the links font-weight, we need to override it
    font-weight: ${euiTheme.font.weight.regular};
  }
  &.solutionSideNavItem--isSelected {
    background-color: ${transparentize(euiTheme.colors.lightShade, 0.5)};
    & * {
      font-weight: ${euiTheme.font.weight.medium};
    }
  }
  // Needed to place the icon on the right side
  span.euiListGroupItem__label {
    width: 100%;
  }
`;
