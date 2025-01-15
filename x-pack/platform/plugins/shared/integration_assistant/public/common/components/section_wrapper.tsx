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
  max-width: 660px;
`;
const titleCss = css`
  text-align: center;
`;

export type SectionWrapperProps = PropsWithChildren<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}>;
export const SectionWrapper = React.memo<SectionWrapperProps>(({ children, title, subtitle }) => (
  <>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem css={contentCss}>
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1 css={titleCss}>{title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {subtitle && (
            <EuiFlexItem>
              <EuiText size="s" textAlign="center" color="subdued">
                {subtitle}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
));
SectionWrapper.displayName = 'SectionWrapper';
