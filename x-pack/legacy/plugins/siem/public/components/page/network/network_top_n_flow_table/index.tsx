/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual, last } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern } from 'src/plugins/data/public';

import { networkActions } from '../../../../store/actions';
import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopNFlowEdges,
  NetworkTopTablesFields,
  NetworkTopTablesSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getNFlowColumnsCurated } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopNFlowEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
  id: string;
  indexPattern: IIndexPattern;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface NetworkTopNFlowTableReduxProps {
  activePage: number;
  limit: number;
  sort: NetworkTopTablesSortField;
}

interface NetworkTopNFlowTableDispatchProps {
  updateNetworkTable: ActionCreator<{
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopNTableType;
    updates: networkModel.TableUpdates;
  }>;
}

type NetworkTopNFlowTableProps = OwnProps &
  NetworkTopNFlowTableReduxProps &
  NetworkTopNFlowTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

export const NetworkTopNFlowTableId = 'networkTopSourceFlow-top-talkers';

const NetworkTopNFlowTableComponent = React.memo<NetworkTopNFlowTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    flowTargeted,
    id,
    indexPattern,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    sort,
    totalCount,
    type,
    updateNetworkTable,
  }) => {
    const columns = useMemo(
      () => getNFlowColumnsCurated(indexPattern, flowTargeted, type, NetworkTopNFlowTableId),
      [indexPattern, flowTargeted, type]
    );

    let tableType: networkModel.TopNTableType;
    const headerTitle: string =
      flowTargeted === FlowTargetSourceDest.source ? i18n.SOURCE_IP : i18n.DESTINATION_IP;

    if (type === networkModel.NetworkType.page) {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.NetworkTableType.topNFlowSource
          : networkModel.NetworkTableType.topNFlowDestination;
    } else {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.IpDetailsTableType.topNFlowSource
          : networkModel.IpDetailsTableType.topNFlowDestination;
    }

    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const splitField = criteria.sort.field.split('.');
          const field = last(splitField);
          const newSortDirection = field !== sort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
          const newTopNFlowSort: NetworkTopTablesSortField = {
            field: field as NetworkTopTablesFields,
            direction: newSortDirection as Direction,
          };
          if (!isEqual(newTopNFlowSort, sort)) {
            updateNetworkTable({
              networkType: type,
              tableType,
              updates: {
                sort: newTopNFlowSort,
              },
            });
          }
        }
      },
      [sort, type, tableType, updateNetworkTable]
    );

    const field =
      sort.field === NetworkTopTablesFields.bytes_out ||
      sort.field === NetworkTopTablesFields.bytes_in
        ? `node.network.${sort.field}`
        : `node.${flowTargeted}.${sort.field}`;

    const updateActivePage = useCallback(
      newPage =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        }),
      [updateNetworkTable, type, tableType]
    );

    const updateLimitPagination = useCallback(
      newLimit =>
        updateNetworkTable({ networkType: type, tableType, updates: { limit: newLimit } }),
      [updateNetworkTable, type, tableType]
    );

    return (
      <PaginatedTable
        activePage={activePage}
        columns={columns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={headerTitle}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={{ field, direction: sort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={updateActivePage}
        updateLimitPagination={updateLimitPagination}
        onChange={onChange}
      />
    );
  }
);

NetworkTopNFlowTableComponent.displayName = 'NetworkTopNFlowTableComponent';

const makeMapStateToProps = () => {
  const getTopNFlowSelector = networkSelectors.topNFlowSelector();
  return (state: State, { type, flowTargeted }: OwnProps) =>
    getTopNFlowSelector(state, type, flowTargeted);
};

export const NetworkTopNFlowTable = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps, {
    updateNetworkTable: networkActions.updateNetworkTable,
  })
)(NetworkTopNFlowTableComponent);
