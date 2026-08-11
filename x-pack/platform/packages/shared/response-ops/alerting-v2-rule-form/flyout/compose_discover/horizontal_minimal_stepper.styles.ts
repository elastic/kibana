/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiCanAnimate } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { MinimalStepStatus } from './horizontal_minimal_stepper';

const DOT_SIZE = 8;
const BAR_WIDTH = 24;
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const useHorizontalMinimalStepperStyles = ({ euiTheme }: UseEuiTheme) => {
  const baseIndicator = css`
    height: ${DOT_SIZE}px;
    flex-shrink: 0;
    ${euiCanAnimate} {
      transition: width 220ms ${SPRING}, border-radius 220ms ${SPRING}, background-color 150ms ease;
    }
  `;

  const indicatorByStatus: Record<MinimalStepStatus, ReturnType<typeof css>> = {
    current: css`
      ${baseIndicator};
      width: ${BAR_WIDTH}px;
      border-radius: ${DOT_SIZE / 2}px;
      background-color: ${euiTheme.colors.primary};
    `,
    complete: css`
      ${baseIndicator};
      width: ${DOT_SIZE}px;
      border-radius: 50%;
      background-color: ${euiTheme.colors.primary};
    `,
    incomplete: css`
      ${baseIndicator};
      width: ${DOT_SIZE}px;
      border-radius: 50%;
      background-color: ${euiTheme.colors.lightShade};
    `,
  };

  const indicatorRow = css`
    display: flex;
    align-items: center;
    gap: 4px;
  `;

  return { indicatorByStatus, indicatorRow };
};
