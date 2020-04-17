/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FilterManager, IIndexPattern } from 'src/plugins/data/public';
import deepEqual from 'fast-deep-equal';

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
  filterManager: FilterManager;
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
}

const TimelineHeaderComponent: React.FC<Props> = ({
  browserFields,
  id,
  indexPattern,
  dataProviders,
  filterManager,
  onChangeDataProviderKqlQuery,
  onChangeDroppableAndProvider,
  onDataProviderEdited,
  onDataProviderRemoved,
  onToggleDataProviderEnabled,
  onToggleDataProviderExcluded,
  show,
  showCallOutUnauthorizedMsg,
}) => (
  <>
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
      filterManager={filterManager}
      indexPattern={indexPattern}
      timelineId={id}
    />
  </>
);

export const TimelineHeader = React.memo(
  TimelineHeaderComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    prevProps.id === nextProps.id &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.filterManager === nextProps.filterManager &&
    prevProps.onChangeDataProviderKqlQuery === nextProps.onChangeDataProviderKqlQuery &&
    prevProps.onChangeDroppableAndProvider === nextProps.onChangeDroppableAndProvider &&
    prevProps.onDataProviderEdited === nextProps.onDataProviderEdited &&
    prevProps.onDataProviderRemoved === nextProps.onDataProviderRemoved &&
    prevProps.onToggleDataProviderEnabled === nextProps.onToggleDataProviderEnabled &&
    prevProps.onToggleDataProviderExcluded === nextProps.onToggleDataProviderExcluded &&
    prevProps.show === nextProps.show &&
    prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg
);
