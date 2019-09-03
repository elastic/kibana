/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  // @ts-ignore
  EuiLoadingSpinnerSize,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const Aside = styled.aside<{ overlay?: boolean; overlayBackground?: string }>`
  ${props => css`
    padding: ${props.theme.eui.paddingSizes.m};

    ${props.overlay &&
      `
      background: ${
        props.overlayBackground ? props.overlayBackground : props.theme.eui.euiColorEmptyShade
      };
      bottom: 0;
      left: 0;
      opacity: 0.9; // Michael - Using opacity instead of rgba because styled components don't support hex colors in rgba
      position: absolute;
      right: 0;
      top: 0;
      z-index: 3;
    `}
  `}
`;

Aside.displayName = 'Aside';

const FlexGroup = styled(EuiFlexGroup).attrs({
  alignItems: 'center',
  direction: 'column',
  gutterSize: 's',
  justifyContent: 'center',
})<{ overlay: { overlay?: boolean } }>`
  ${({ overlay }) =>
    overlay &&
    `
    height: 100%;
  `}
`;

FlexGroup.displayName = 'FlexGroup';

export interface LoaderProps {
  overlay?: boolean;
  overlayBackground?: string;
  size?: EuiLoadingSpinnerSize;
}

export const Loader = pure<LoaderProps>(({ children, overlay, overlayBackground, size }) => (
  <Aside overlay={overlay} overlayBackground={overlayBackground}>
    <FlexGroup overlay={{ overlay }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size={size} />
      </EuiFlexItem>

      {children && (
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <p>{children}</p>
          </EuiText>
        </EuiFlexItem>
      )}
    </FlexGroup>
  </Aside>
));

Loader.displayName = 'Loader';
