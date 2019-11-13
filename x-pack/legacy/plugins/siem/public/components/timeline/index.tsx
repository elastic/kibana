/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';
import { timelineActions } from '../../store/actions';
import { KqlMode, TimelineModel } from '../../store/timeline/model';

import { ColumnHeader } from './body/column_headers/column_header';
import { DataProvider, QueryOperator } from './data_providers/data_provider';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnDataProviderEdited,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { Timeline } from './timeline';

export interface OwnProps {
  id: string;
  flyoutHeaderHeight: number;
  flyoutHeight: number;
}

interface StateReduxProps {
  activePage?: number;
  columns: ColumnHeader[];
  dataProviders?: DataProvider[];
  end: number;
  isLive: boolean;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  pageCount?: number;
  sort?: Sort;
  start: number;
  show?: boolean;
  showCallOutUnauthorizedMsg: boolean;
}

interface DispatchProps {
  createTimeline?: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
    show?: boolean;
  }>;
  addProvider?: ActionCreator<{
    id: string;
    provider: DataProvider;
  }>;
  onDataProviderEdited?: ActionCreator<{
    andProviderId?: string;
    excluded: boolean;
    field: string;
    id: string;
    operator: QueryOperator;
    providerId: string;
    value: string | number;
  }>;
  updateColumns?: ActionCreator<{
    id: string;
    category: string;
    columns: ColumnHeader[];
  }>;
  updateProviders?: ActionCreator<{
    id: string;
    providers: DataProvider[];
  }>;
  removeColumn?: ActionCreator<{
    id: string;
    columnId: string;
  }>;
  removeProvider?: ActionCreator<{
    id: string;
    providerId: string;
    andProviderId?: string;
  }>;
  updateDataProviderEnabled?: ActionCreator<{
    id: string;
    providerId: string;
    enabled: boolean;
    andProviderId?: string;
  }>;
  updateDataProviderExcluded?: ActionCreator<{
    id: string;
    excluded: boolean;
    providerId: string;
    andProviderId?: string;
  }>;
  updateDataProviderKqlQuery?: ActionCreator<{
    id: string;
    kqlQuery: string;
    providerId: string;
  }>;
  updateItemsPerPage?: ActionCreator<{
    id: string;
    itemsPerPage: number;
  }>;
  updateItemsPerPageOptions?: ActionCreator<{
    id: string;
    itemsPerPageOptions: number[];
  }>;
  updatePageIndex?: ActionCreator<{
    id: string;
    activePage: number;
  }>;
  updateHighlightedDropAndProviderId?: ActionCreator<{
    id: string;
    providerId: string;
  }>;
  upsertColumn?: ActionCreator<{
    column: ColumnHeader;
    id: string;
    index: number;
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const StatefulTimelineComponent = React.memo<Props>(
  ({
    columns,
    createTimeline,
    dataProviders,
    end,
    flyoutHeaderHeight,
    flyoutHeight,
    id,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    onDataProviderEdited,
    removeColumn,
    removeProvider,
    show,
    showCallOutUnauthorizedMsg,
    sort,
    start,
    updateDataProviderEnabled,
    updateDataProviderExcluded,
    updateDataProviderKqlQuery,
    updateHighlightedDropAndProviderId,
    updateItemsPerPage,
    upsertColumn,
  }) => {
    const onDataProviderRemoved: OnDataProviderRemoved = useCallback(
      (providerId: string, andProviderId?: string) =>
        removeProvider!({ id, providerId, andProviderId }),
      [id]
    );

    const onToggleDataProviderEnabled: OnToggleDataProviderEnabled = useCallback(
      ({ providerId, enabled, andProviderId }) =>
        updateDataProviderEnabled!({
          id,
          enabled,
          providerId,
          andProviderId,
        }),
      [id]
    );

    const onToggleDataProviderExcluded: OnToggleDataProviderExcluded = useCallback(
      ({ providerId, excluded, andProviderId }) =>
        updateDataProviderExcluded!({
          id,
          excluded,
          providerId,
          andProviderId,
        }),
      [id]
    );

    const onDataProviderEditedLocal: OnDataProviderEdited = useCallback(
      ({ andProviderId, excluded, field, operator, providerId, value }) =>
        onDataProviderEdited!({
          andProviderId,
          excluded,
          field,
          id,
          operator,
          providerId,
          value,
        }),
      [id]
    );

    const onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery = useCallback(
      ({ providerId, kqlQuery }) => updateDataProviderKqlQuery!({ id, kqlQuery, providerId }),
      [id]
    );

    const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(
      itemsChangedPerPage => updateItemsPerPage!({ id, itemsPerPage: itemsChangedPerPage }),
      [id]
    );

    const onChangeDroppableAndProvider: OnChangeDroppableAndProvider = useCallback(
      providerId => updateHighlightedDropAndProviderId!({ id, providerId }),
      [id]
    );

    const toggleColumn = useCallback(
      (column: ColumnHeader) => {
        const exists = columns.findIndex(c => c.id === column.id) !== -1;

        if (!exists && upsertColumn != null) {
          upsertColumn({
            column,
            id,
            index: 1,
          });
        }

        if (exists && removeColumn != null) {
          removeColumn({
            columnId: column.id,
            id,
          });
        }
      },
      [columns, id]
    );

    useEffect(() => {
      if (createTimeline != null) {
        createTimeline({ id, columns: defaultHeaders, show: false });
      }
    }, []);

    return (
      <WithSource sourceId="default">
        {({ indexPattern, browserFields }) => (
          <Timeline
            browserFields={browserFields}
            columns={columns}
            dataProviders={dataProviders!}
            end={end}
            flyoutHeaderHeight={flyoutHeaderHeight}
            flyoutHeight={flyoutHeight}
            id={id}
            indexPattern={indexPattern}
            isLive={isLive}
            itemsPerPage={itemsPerPage!}
            itemsPerPageOptions={itemsPerPageOptions!}
            kqlMode={kqlMode}
            kqlQueryExpression={kqlQueryExpression}
            onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={onChangeDroppableAndProvider}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onDataProviderEdited={onDataProviderEditedLocal}
            onDataProviderRemoved={onDataProviderRemoved}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={onToggleDataProviderExcluded}
            show={show!}
            showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
            sort={sort!}
            start={start}
            toggleColumn={toggleColumn}
          />
        )}
      </WithSource>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.activePage === nextProps.activePage &&
      prevProps.end === nextProps.end &&
      prevProps.flyoutHeaderHeight === nextProps.flyoutHeaderHeight &&
      prevProps.flyoutHeight === nextProps.flyoutHeight &&
      prevProps.id === nextProps.id &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.kqlMode === nextProps.kqlMode &&
      prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
      prevProps.pageCount === nextProps.pageCount &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.start === nextProps.start &&
      isEqual(prevProps.columns, nextProps.columns) &&
      isEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      isEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      isEqual(prevProps.sort, nextProps.sort)
    );
  }
);

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id);
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      columns,
      dataProviders,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      show,
      sort,
    } = timeline;
    const kqlQueryExpression = getKqlQueryTimeline(state, id);

    return {
      columns,
      dataProviders,
      end: input.timerange.to,
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      show,
      showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
      sort,
      start: input.timerange.from,
    };
  };
  return mapStateToProps;
};

export const StatefulTimeline = connect(makeMapStateToProps, {
  addProvider: timelineActions.addProvider,
  createTimeline: timelineActions.createTimeline,
  onDataProviderEdited: timelineActions.dataProviderEdited,
  removeColumn: timelineActions.removeColumn,
  removeProvider: timelineActions.removeProvider,
  updateColumns: timelineActions.updateColumns,
  updateDataProviderEnabled: timelineActions.updateDataProviderEnabled,
  updateDataProviderExcluded: timelineActions.updateDataProviderExcluded,
  updateDataProviderKqlQuery: timelineActions.updateDataProviderKqlQuery,
  updateHighlightedDropAndProviderId: timelineActions.updateHighlightedDropAndProviderId,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
  updateSort: timelineActions.updateSort,
  upsertColumn: timelineActions.upsertColumn,
})(StatefulTimelineComponent);
