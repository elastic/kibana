/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

import { InspectButton } from '../inspect';

const Header = styled.header<{ border?: boolean }>`
  ${props => css`
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
  id?: string;
  subtitle?: string | React.ReactNode;
  showInspect?: boolean;
  title: string | React.ReactNode;
  tooltip?: string;
}

export const HeaderPanel = pure<HeaderPanelProps>(
  ({ border, children, id, showInspect = false, subtitle, title, tooltip }) => (
    <Header border={border}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2 data-test-subj="page_headline_title">{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {tooltip && (
              <EuiFlexItem grow={false}>
                <EuiIconTip color="subdued" content={tooltip} position="top" size="l" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiText color="subdued" size="s">
            {subtitle}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {id && <InspectButton queryId={id} inspectIndex={0} show={showInspect} title={title} />}
        </EuiFlexItem>
        {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </Header>
  )
);
