/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { InspectButton } from '../inspect';

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

const MyEuiFlexItemIcon = styled(EuiFlexItem)`
  padding-left: 5px;
`;

export interface HeaderPanelProps {
  border?: boolean;
  children?: React.ReactNode;
  id?: string;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
  tooltip?: string;
}

export const HeaderPanel = pure<HeaderPanelProps>(
  ({ border, children, id, subtitle, title, tooltip }) => (
    <Header border={border}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} component="span">
              <EuiTitle>
                <h2 data-test-subj="page_headline_title">{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {tooltip && (
              <MyEuiFlexItemIcon grow={false} component="span">
                <EuiIconTip color="subdued" content={tooltip} position="top" size="l" />
              </MyEuiFlexItemIcon>
            )}
            <MyEuiFlexItemIcon component="span">
              {id && (
                <>
                  <InspectButton queryId={id} title={title} inspectIndex={0} />
                </>
              )}
            </MyEuiFlexItemIcon>
          </EuiFlexGroup>
          <EuiText color="subdued" size="s">
            {subtitle}
          </EuiText>
        </EuiFlexItem>

        {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </Header>
  )
);
