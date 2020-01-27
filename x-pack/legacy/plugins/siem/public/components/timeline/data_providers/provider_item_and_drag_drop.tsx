/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBadgeProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { rgba } from 'polished';
import * as React from 'react';
import styled from 'styled-components';

import { AndOrBadge } from '../../and_or_badge';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';

import { BrowserFields } from '../../../containers/source';

import { DataProvider } from './data_provider';
import { ProviderItemAnd } from './provider_item_and';

import * as i18n from './translations';

const DropAndTargetDataProvidersContainer = styled(EuiFlexItem)`
  margin: 0px 8px;
`;

DropAndTargetDataProvidersContainer.displayName = 'DropAndTargetDataProvidersContainer';

const DropAndTargetDataProviders = styled.div<{ hasAndItem: boolean }>`
  min-width: 230px;
  width: auto;
  border: 0.1rem dashed ${props => props.theme.eui.euiColorSuccess};
  border-radius: 5px;
  text-align: center;
  padding: 3px 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  ${props =>
    props.hasAndItem
      ? `&:hover {
    transition: background-color 0.7s ease;
    background-color: ${() => rgba(props.theme.eui.euiColorSuccess, 0.2)};
  }`
      : ''};
  cursor: ${({ hasAndItem }) => (!hasAndItem ? `default` : 'inherit')};
`;

DropAndTargetDataProviders.displayName = 'DropAndTargetDataProviders';

// Ref: https://github.com/elastic/eui/issues/1655
// const NumberProviderAndBadge = styled(EuiBadge)`
//   margin: 0px 5px;
// `;
const NumberProviderAndBadge = (props: EuiBadgeProps) => (
  <EuiBadge {...props} style={{ margin: '0px 5px' }} />
);

NumberProviderAndBadge.displayName = 'NumberProviderAndBadge';

interface ProviderItemDropProps {
  browserFields: BrowserFields;
  dataProvider: DataProvider;
  mousePosition?: { x: number; y: number; boundLeft: number; boundTop: number };
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  timelineId: string;
}

export const ProviderItemAndDragDrop = React.memo<ProviderItemDropProps>(
  ({
    browserFields,
    dataProvider,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onDataProviderEdited,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    timelineId,
  }) => {
    const onMouseEnter = () => onChangeDroppableAndProvider(dataProvider.id);
    const onMouseLeave = () => onChangeDroppableAndProvider('');
    const hasAndItem = dataProvider.and.length > 0;
    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        justifyContent="flexStart"
        alignItems="center"
      >
        <DropAndTargetDataProvidersContainer className="drop-and-provider-timeline">
          <DropAndTargetDataProviders
            hasAndItem={hasAndItem}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {hasAndItem && (
              <NumberProviderAndBadge color="primary">
                {dataProvider.and.length}
              </NumberProviderAndBadge>
            )}
            <EuiText color="subdued" size="xs">
              {i18n.DROP_HERE_TO_ADD_AN}
            </EuiText>
            <AndOrBadge type="and" />
          </DropAndTargetDataProviders>
        </DropAndTargetDataProvidersContainer>
        <ProviderItemAnd
          browserFields={browserFields}
          dataProvidersAnd={dataProvider.and}
          providerId={dataProvider.id}
          onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
          onDataProviderEdited={onDataProviderEdited}
          onDataProviderRemoved={onDataProviderRemoved}
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          onToggleDataProviderExcluded={onToggleDataProviderExcluded}
          timelineId={timelineId}
        />
      </EuiFlexGroup>
    );
  }
);

ProviderItemAndDragDrop.displayName = 'ProviderItemAndDragDrop';
