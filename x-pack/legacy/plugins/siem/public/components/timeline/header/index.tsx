/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { IIndexPattern } from 'src/plugins/data/public';

import { Sort } from '../body/sort';
import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { StatefulSearchOrFilter } from '../search_or_filter';
import { BrowserFields } from '../../../containers/source';

import * as i18n from './translations';

interface Props {
  browserFields: BrowserFields;
  dataProviders: DataProvider[];
  id: string;
  indexPattern: IIndexPattern;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  sort: Sort;
}

const TimelineHeaderContainer = styled.div`
  width: 100%;
`;

TimelineHeaderContainer.displayName = 'TimelineHeaderContainer';

export const TimelineHeaderComponent = ({
  browserFields,
  id,
  indexPattern,
  dataProviders,
  onChangeDataProviderKqlQuery,
  onChangeDroppableAndProvider,
  onDataProviderEdited,
  onDataProviderRemoved,
  onToggleDataProviderEnabled,
  onToggleDataProviderExcluded,
  show,
  showCallOutUnauthorizedMsg,
}: Props) => (
  <TimelineHeaderContainer data-test-subj="timelineHeader">
    {showCallOutUnauthorizedMsg && (
      <EuiCallOut
        data-test-subj="timelineCallOutUnauthorized"
        title={i18n.CALL_OUT_UNAUTHORIZED_MSG}
        color="warning"
        iconType="alert"
        size="s"
      />
    )}
    <DataProviders
      browserFields={browserFields}
      id={id}
      dataProviders={dataProviders}
      onChangeDroppableAndProvider={onChangeDroppableAndProvider}
      onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
      onDataProviderEdited={onDataProviderEdited}
      onDataProviderRemoved={onDataProviderRemoved}
      onToggleDataProviderEnabled={onToggleDataProviderEnabled}
      onToggleDataProviderExcluded={onToggleDataProviderExcluded}
      show={show}
    />
    <StatefulSearchOrFilter
      browserFields={browserFields}
      indexPattern={indexPattern}
      timelineId={id}
    />
  </TimelineHeaderContainer>
);

TimelineHeaderComponent.displayName = 'TimelineHeaderComponent';

export const TimelineHeader = React.memo(TimelineHeaderComponent);

TimelineHeader.displayName = 'TimelineHeader';
