/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { InspectButton } from '../inspect';
import { Subtitle, SubtitleProps } from '../subtitle';

interface HeaderProps {
  border?: boolean;
}

const Header = styled.header.attrs({
  className: 'siemHeaderPanel',
})<HeaderProps>`
  ${({ border, theme }) => css`
    margin-bottom: ${theme.eui.euiSizeL};
    user-select: text;

    ${border &&
      css`
        border-bottom: ${theme.eui.euiBorderThin};
        padding-bottom: ${theme.eui.euiSizeL};
      `}
  `}
`;
Header.displayName = 'Header';

export interface HeaderPanelProps extends HeaderProps {
  children?: React.ReactNode;
  id?: string;
  subtitle?: SubtitleProps['text'];
  showInspect?: boolean;
  title: string | React.ReactNode;
  tooltip?: string;
}

export const HeaderPanel = React.memo<HeaderPanelProps>(
  ({ border, children, id, showInspect = false, subtitle, title, tooltip }) => (
    <Header border={border}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiTitle>
                <h2 data-test-subj="header-panel-title">
                  {title}
                  {tooltip && (
                    <>
                      {' '}
                      <EuiIconTip color="subdued" content={tooltip} size="l" type="iInCircle" />
                    </>
                  )}
                </h2>
              </EuiTitle>

              {subtitle && <Subtitle text={subtitle} />}
            </EuiFlexItem>

            {id && (
              <EuiFlexItem grow={false}>
                <InspectButton queryId={id} inspectIndex={0} show={showInspect} title={title} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {children && (
          <EuiFlexItem data-test-subj="header-panel-supplements" grow={false}>
            {children}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Header>
  )
);
HeaderPanel.displayName = 'HeaderPanel';
