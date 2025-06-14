/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SerializedStyles } from '@emotion/serialize';

type EmotionFn = (theme: UseEuiTheme) => SerializedStyles;

const MAX_WIDTH = 575;

const root =
  (beaconSize: number): EmotionFn =>
  ({ euiTheme: { size } }) =>
    css`
      padding: ${size.xl};
      max-width: ${MAX_WIDTH}px;
      margin: ${0 - beaconSize}px auto 0 auto;
    `;

const actions: EmotionFn = ({ euiTheme: { size } }) => css`
  padding: ${size.m};
`;

export const styles = {
  actions,
  root,
};
