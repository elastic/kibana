/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern } from 'src/plugins/data/public';

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
  indexPattern: IIndexPattern;
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
  sort: NetworkTopTablesSortField;
}

interface NetworkTopCountriesTableDispatchProps {
  updateNetworkTable: ActionCreator<{
    networkType: networkModel.NetworkType;
    tableType: networkModel.AllNetworkTables;
    updates: networkModel.TableUpdates;
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
    sort,
    totalCount,
    type,
    updateNetworkTable,
  }) => {
    const onChange = (criteria: Criteria, tableType: networkModel.TopCountriesTableType) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection = field !== sort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopCountriesSort: NetworkTopTablesSortField = {
          field: field as NetworkTopTablesFields,
          direction: newSortDirection,
        };
        if (!isEqual(newTopCountriesSort, sort)) {
          updateNetworkTable({
            networkType: type,
            tableType,
            updates: {
              sort: newTopCountriesSort,
            },
          });
        }
      }
    };

    let tableType: networkModel.TopCountriesTableType;
    const headerTitle: string =
      flowTargeted === FlowTargetSourceDest.source
        ? i18n.SOURCE_COUNTRIES
        : i18n.DESTINATION_COUNTRIES;

    if (type === networkModel.NetworkType.page) {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.NetworkTableType.topCountriesSource
          : networkModel.NetworkTableType.topCountriesDestination;
    } else {
      tableType =
        flowTargeted === FlowTargetSourceDest.source
          ? networkModel.IpDetailsTableType.topCountriesSource
          : networkModel.IpDetailsTableType.topCountriesDestination;
    }

    const field =
      sort.field === NetworkTopTablesFields.bytes_out ||
      sort.field === NetworkTopTablesFields.bytes_in
        ? `node.network.${sort.field}`
        : `node.${flowTargeted}.${sort.field}`;

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
        sorting={{ field, direction: sort.direction }}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateNetworkTable({
            networkType: type,
            tableType,
            updates: { activePage: newPage },
          })
        }
        updateLimitPagination={newLimit =>
          updateNetworkTable({
            networkType: type,
            tableType,
            updates: { limit: newLimit },
          })
        }
      />
    );
  }
);

NetworkTopCountriesTableComponent.displayName = 'NetworkTopCountriesTableComponent';

const makeMapStateToProps = () => {
  const getTopCountriesSelector = networkSelectors.topCountriesSelector();
  return (state: State, { type, flowTargeted }: OwnProps) =>
    getTopCountriesSelector(state, type, flowTargeted);
};

export const NetworkTopCountriesTable = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps, {
    updateNetworkTable: networkActions.updateNetworkTable,
  })
)(NetworkTopCountriesTableComponent);
