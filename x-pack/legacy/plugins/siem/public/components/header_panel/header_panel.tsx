/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Header = styled.header<{ border?: boolean }>`
  ${props => `
    margin-bottom: ${props.theme.eui.euiSizeL};

    ${props.border &&
      `
      border-bottom: ${props.theme.eui.euiBorderThin};
      padding-bottom: ${props.theme.eui.euiSizeL};
    `}
  `}
`;

export interface HeaderPanelProps {
  border?: boolean;
  children?: React.ReactNode;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
  tooltip?: string;
}

export const HeaderPanel = pure<HeaderPanelProps>(
  ({ border, children, subtitle, title, tooltip }) => (
    <Header border={border}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle>
            <h2 data-test-subj="page_headline_title">
              {title}{' '}
              {tooltip && <EuiIconTip color="subdued" content={tooltip} position="top" size="l" />}
            </h2>
          </EuiTitle>

          <EuiText color="subdued" size="s">
            {subtitle}
          </EuiText>
        </EuiFlexItem>

        {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </Header>
  )
);
