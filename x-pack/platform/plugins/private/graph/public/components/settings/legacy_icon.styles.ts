/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const legacyIconStyles = {
  base: ({ euiTheme }: UseEuiTheme) => css`
    width: calc(${euiTheme.size.s} * 2);
  `,

  list: ({ euiTheme }: UseEuiTheme) => css`
    margin-right: ${euiTheme.size.m};
  `,

  pickable: ({ euiTheme }: UseEuiTheme) => css`
    margin: ${euiTheme.size.xs};
    cursor: pointer;
    opacity: 0.7;

    &:hover,
    &:focus {
      transform: scale(1.4);
      opacity: 1;
    }
  `,

  selected: css`
    transform: scale(1.4);
    opacity: 1;
  `,
};
