/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';

const contentCss = css`
  width: 100%;
  max-width: 730px;
`;

export type StepContentWrapperProps = PropsWithChildren<{
  title: React.ReactNode;
  subtitle: React.ReactNode;
  right?: React.ReactNode;
}>;

export const StepContentWrapper = React.memo<StepContentWrapperProps>(
  ({ children, title, subtitle, right }) => (
    <>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem css={contentCss}>
          <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiFlexGroup
                direction="column"
                alignItems="flexStart"
                justifyContent="flexStart"
                gutterSize="xs"
              >
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h1>{title}</h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    {subtitle}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {right && <EuiFlexItem grow={false}>{right}</EuiFlexItem>}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  )
);
StepContentWrapper.displayName = 'StepContentWrapper';
