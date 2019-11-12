/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

const Header = styled.header.attrs({
  className: 'siemEmbeddable__header',
})`
  ${({ theme }) => css`
    border-bottom: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.paddingSizes.m};
  `}
`;
Header.displayName = 'Header';

export interface EmbeddableHeaderProps {
  children?: React.ReactNode;
  title: string | React.ReactNode;
}

export const EmbeddableHeader = React.memo<EmbeddableHeaderProps>(({ children, title }) => (
  <Header>
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem>
        <EuiTitle size="xxxs">
          <h6 data-test-subj="header-embeddable-title">{title}</h6>
        </EuiTitle>
      </EuiFlexItem>

      {children && (
        <EuiFlexItem data-test-subj="header-embeddable-supplements" grow={false}>
          {children}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </Header>
));
EmbeddableHeader.displayName = 'EmbeddableHeader';
