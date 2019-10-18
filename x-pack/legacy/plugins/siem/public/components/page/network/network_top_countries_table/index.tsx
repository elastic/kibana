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
  NetworkTopCountriesEdges,
  NetworkTopTablesFields,
  NetworkTopTablesSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getCountriesColumnsCurated } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopCountriesEdges[];
  fakeTotalCount: number;
  flowTargeted: FlowTargetSourceDest;
  id: string;
  indexPattern: StaticIndexPattern;
  ip?: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

interface NetworkTopCountriesTableReduxProps {
  activePage: number;
  limit: number;
  topCountriesSort: NetworkTopTablesSortField;
}

interface NetworkTopCountriesTableDispatchProps {
  updateIpDetailsTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.IpDetailsTableType;
  }>;
  updateNetworkPageTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.NetworkTableType;
  }>;
  updateTopCountriesLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopCountriesTableType;
  }>;
  updateTopCountriesSort: ActionCreator<{
    topCountriesSort: NetworkTopTablesSortField;
    networkType: networkModel.NetworkType;
    tableType: networkModel.TopCountriesTableType;
  }>;
}

type NetworkTopCountriesTableProps = OwnProps &
  NetworkTopCountriesTableReduxProps &
  NetworkTopCountriesTableDispatchProps;

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

export const NetworkTopCountriesTableId = 'networkTopCountries-top-talkers';

const NetworkTopCountriesTableComponent = React.memo<NetworkTopCountriesTableProps>(
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
    topCountriesSort,
    totalCount,
    type,
    updateIpDetailsTableActivePage,
    updateTopCountriesLimit,
    updateTopCountriesSort,
    updateNetworkPageTableActivePage,
  }) => {
    const onChange = (criteria: Criteria, tableType: networkModel.TopCountriesTableType) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection =
          field !== topCountriesSort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopCountriesSort: NetworkTopTablesSortField = {
          field: field as NetworkTopTablesFields,
          direction: newSortDirection,
        };
        if (!isEqual(newTopCountriesSort, topCountriesSort)) {
          updateTopCountriesSort({
            topCountriesSort: newTopCountriesSort,
            networkType: type,
            tableType,
          });
        }
      }
    };

    let tableType: networkModel.TopCountriesTableType;
    const headerTitle: string =
      flowTargeted === FlowTargetSourceDest.source
        ? i18n.SOURCE_COUNTRIES
        : i18n.DESTINATION_COUNTRIES;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateTableActivePage: any;
    if (type === networkModel.NetworkType.page) {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.NetworkTableType.topCountriesSource
          : networkModel.NetworkTableType.topCountriesDestination;
      updateTableActivePage = updateNetworkPageTableActivePage;
    } else {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.IpDetailsTableType.topCountriesSource
          : networkModel.IpDetailsTableType.topCountriesDestination;
      updateTableActivePage = updateIpDetailsTableActivePage;
    }

    const field =
      topCountriesSort.field === NetworkTopTablesFields.bytes_out ||
      topCountriesSort.field === NetworkTopTablesFields.bytes_in
        ? `node.network.${topCountriesSort.field}`
        : `node.${flowTargeted}.${topCountriesSort.field}`;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getCountriesColumnsCurated(
          indexPattern,
          flowTargeted,
          type,
          NetworkTopCountriesTableId
        )}
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
        sorting={{ field, direction: topCountriesSort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit =>
          updateTopCountriesLimit({ limit: newLimit, networkType: type, tableType })
        }
      />
    );
  }
);

NetworkTopCountriesTableComponent.displayName = 'NetworkTopCountriesTableComponent';

const mapStateToProps = (state: State, ownProps: OwnProps) =>
  networkSelectors.topCountriesSelector(ownProps.flowTargeted, ownProps.type);

export const NetworkTopCountriesTable = connect(
  mapStateToProps,
  {
    updateTopCountriesLimit: networkActions.updateTopCountriesLimit,
    updateTopCountriesSort: networkActions.updateTopCountriesSort,
    updateNetworkPageTableActivePage: networkActions.updateNetworkPageTableActivePage,
    updateIpDetailsTableActivePage: networkActions.updateIpDetailsTableActivePage,
  }
)(NetworkTopCountriesTableComponent);
