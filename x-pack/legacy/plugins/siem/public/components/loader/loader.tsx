/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiLoadingSpinner,
  // @ts-ignore
  EuiLoadingSpinnerSize,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const Aside = styled.aside<{ overlay?: boolean; overlayBackground?: string }>`
  ${props => css`
    align-items: center;
    display: flex;
    justify-content: center;

    ${props.overlay &&
      `
      background: ${
        props.overlayBackground ? props.overlayBackground : props.theme.eui.euiColorEmptyShade
      };
      bottom: 0;
      left: 0;
      opacity: 0.9; //Using opacity instead of rgba because styled components don't appear to support rgba with hex colors
      position: absolute;
      right: 0;
      top: 0;
      z-index: 3;
    `}
  `}
`;

export interface LoaderProps {
  overlay?: boolean;
  overlayBackground?: string;
  size?: EuiLoadingSpinnerSize;
}

export const Loader = pure<LoaderProps>(({ overlay, overlayBackground, size }) => (
  <Aside overlay={overlay} overlayBackground={overlayBackground}>
    <EuiLoadingSpinner size={size} />
  </Aside>
));
