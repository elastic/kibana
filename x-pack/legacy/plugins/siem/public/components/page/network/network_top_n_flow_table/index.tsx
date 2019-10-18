/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

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
  indexPattern: StaticIndexPattern;
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
  topNFlowSort: NetworkTopTablesSortField;
}

interface NetworkTopNFlowTableDispatchProps {
  updateIpDetailsTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.IpDetailsTableType;
  }>;
  updateNetworkPageTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.NetworkTableType;
  }>;
  updateTopNFlowLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopNTableType;
  }>;
  updateTopNFlowSort: ActionCreator<{
    topNFlowSort: NetworkTopTablesSortField;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopNTableType;
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
    topNFlowSort,
    totalCount,
    type,
    updateIpDetailsTableActivePage,
    updateNetworkPageTableActivePage,
    updateTopNFlowLimit,
    updateTopNFlowSort,
  }) => {
    const onChange = (criteria: Criteria, tableType: networkModel.TopNTableType) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection =
          field !== topNFlowSort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopNFlowSort: NetworkTopTablesSortField = {
          field: field as NetworkTopTablesFields,
          direction: newSortDirection,
        };
        if (!isEqual(newTopNFlowSort, topNFlowSort)) {
          updateTopNFlowSort({
            topNFlowSort: newTopNFlowSort,
            networkType: type,
            tableType,
          });
        }
      }
    };

    let tableType: networkModel.TopNTableType;
    const headerTitle: string =
      flowTargeted === FlowTargetSourceDest.source ? i18n.SOURCE_IP : i18n.DESTINATION_IP;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateTableActivePage: any;
    if (type === networkModel.NetworkType.page) {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.NetworkTableType.topNFlowSource
          : networkModel.NetworkTableType.topNFlowDestination;
      updateTableActivePage = updateNetworkPageTableActivePage;
    } else {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.IpDetailsTableType.topNFlowSource
          : networkModel.IpDetailsTableType.topNFlowDestination;
      updateTableActivePage = updateIpDetailsTableActivePage;
    }

    const field =
      topNFlowSort.field === NetworkTopTablesFields.bytes_out ||
      topNFlowSort.field === NetworkTopTablesFields.bytes_in
        ? `node.network.${topNFlowSort.field}`
        : `node.${flowTargeted}.${topNFlowSort.field}`;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getNFlowColumnsCurated(indexPattern, flowTargeted, type, NetworkTopNFlowTableId)}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={headerTitle}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={criteria => onChange(criteria, tableType)}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={{ field, direction: topNFlowSort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit =>
          updateTopNFlowLimit({ limit: newLimit, networkType: type, tableType })
        }
      />
    );
  }
);

NetworkTopNFlowTableComponent.displayName = 'NetworkTopNFlowTableComponent';

const mapStateToProps = (state: State, ownProps: OwnProps) =>
  networkSelectors.topNFlowSelector(ownProps.flowTargeted, ownProps.type);

export const NetworkTopNFlowTable = connect(
  mapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowSort: networkActions.updateTopNFlowSort,
    updateNetworkPageTableActivePage: networkActions.updateNetworkPageTableActivePage,
    updateIpDetailsTableActivePage: networkActions.updateIpDetailsTableActivePage,
  }
)(NetworkTopNFlowTableComponent);
