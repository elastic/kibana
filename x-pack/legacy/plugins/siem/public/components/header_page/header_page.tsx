/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { DefaultDraggable } from '../draggables';

const Header = styled.header`
  ${({ theme }) => `
    border-bottom: ${theme.eui.euiBorderThin};
    padding-bottom: ${theme.eui.euiSizeL};
    margin: ${theme.eui.euiSizeL} 0;
  `}
`;

Header.displayName = 'Header';

interface DraggableArguments {
  field: string;
  value: string;
}

export interface HeaderPageProps {
  badgeLabel?: string;
  badgeTooltip?: string;
  children?: React.ReactNode;
  draggableArguments?: DraggableArguments;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
}

export const HeaderPage = pure<HeaderPageProps>(
  ({ badgeLabel, badgeTooltip, children, draggableArguments, subtitle, title, ...rest }) => (
    <Header {...rest}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1 data-test-subj="page_headline_title">
              {!draggableArguments ? (
                title
              ) : (
                <DefaultDraggable
                  data-test-subj="page_headline_draggable"
                  id={`header-page-draggable-${draggableArguments.field}-${draggableArguments.value}`}
                  field={draggableArguments.field}
                  value={`${draggableArguments.value}`}
                />
              )}
              {badgeLabel && (
                <>
                  {' '}
                  <EuiBetaBadge
                    label={badgeLabel}
                    tooltipContent={badgeTooltip}
                    tooltipPosition="bottom"
                  />
                </>
              )}
            </h1>
          </EuiTitle>

          <EuiText color="subdued" size="xs">
            {subtitle}
          </EuiText>
        </EuiFlexItem>

        {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </Header>
  )
);

HeaderPage.displayName = 'HeaderPage';
