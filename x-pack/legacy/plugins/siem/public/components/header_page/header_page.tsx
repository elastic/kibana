/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { Provider } from '../timeline/data_providers/provider';
import { escapeDataProviderId } from '../drag_and_drop/helpers';

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
  'data-test-subj'?: string;
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
                <DraggableWrapper
                  data-test-subj="page_headline_draggable"
                  dataProvider={{
                    and: [],
                    enabled: true,
                    id: escapeDataProviderId(
                      `header-page-draggable-${draggableArguments.field}-${draggableArguments.value}`
                    ),
                    name: `${title}`,
                    excluded: false,
                    kqlQuery: '',
                    queryMatch: {
                      field: draggableArguments.field,
                      value: `${draggableArguments.value}`,
                      operator: IS_OPERATOR,
                    },
                  }}
                  render={(dataProvider, _, snapshot) =>
                    snapshot.isDragging ? (
                      <DragEffects>
                        <Provider dataProvider={dataProvider} />
                      </DragEffects>
                    ) : (
                      title
                    )
                  }
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
