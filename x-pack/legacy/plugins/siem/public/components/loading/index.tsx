/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { injectGlobal } from 'styled-components';

// SIDE EFFECT: the following `injectGlobal` overrides default styling in angular code that was not theme-friendly
// eslint-disable-next-line no-unused-expressions
injectGlobal`
  .euiPanel-loading-hide-border {
    border: none;
  }
`;

const SpinnerFlexItem = styled(EuiFlexItem)`
  margin-right: 5px;
`;

interface LoadingProps {
  text: string;
  height: number | string;
  showBorder?: boolean;
  width: number | string;
  zIndex?: number | string;
  position?: string;
}

export const LoadingPanel = pure<LoadingProps>(
  ({
    height = 'auto',
    showBorder = true,
    text,
    width,
    position = 'relative',
    zIndex = 'inherit',
  }) => (
    <LoadingStaticPanel
      className="app-loading"
      height={height}
      width={width}
      position={position}
      zIndex={zIndex}
    >
      <LoadingStaticContentPanel>
        <EuiPanel className={showBorder ? '' : 'euiPanel-loading-hide-border'}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <SpinnerFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </SpinnerFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>{text}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </LoadingStaticContentPanel>
    </LoadingStaticPanel>
  )
);

export const LoadingStaticPanel = styled.div<{
  height: number | string;
  position: string;
  width: number | string;
  zIndex: number | string;
}>`
  height: ${({ height }) => height};
  position: ${({ position }) => position};
  width: ${({ width }) => width};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: ${({ zIndex }) => zIndex};
`;

export const LoadingStaticContentPanel = styled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
  height: fit-content;
  .euiPanel.euiPanel--paddingMedium {
    padding: 10px;
  }
`;
