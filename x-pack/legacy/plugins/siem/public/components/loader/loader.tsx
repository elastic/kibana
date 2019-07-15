/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const Aside = styled.aside<{ overlay?: boolean }>`
  ${props => css`
    align-items: center;
    display: flex;
    justify-content: center;

    ${props.overlay &&
      `
      background: rgba(255, 255, 255, 0.9);
      bottom: 0;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
      z-index: ${props.theme.eui.euiZHeader};
    `}
  `}
`;

export interface LoaderProps {
  overlay?: boolean;
  size?: string;
}

export const Loader = pure<LoaderProps>(({ overlay, size }) => (
  <Aside overlay={overlay}>
    <EuiLoadingSpinner size={size} />
  </Aside>
));
