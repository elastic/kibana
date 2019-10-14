/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexItem } from '@elastic/eui';
import { isEqual, last } from 'lodash/fp';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { networkActions } from '../../../../store/actions';
import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getNetworkTopCountriesColumns } from './columns';
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
  topCountriesSort: NetworkTopNFlowSortField;
}

interface NetworkTopCountriesTableDispatchProps {
  setIpDetailsTablesActivePageToZero: ActionCreator<null>;
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
    topCountriesSort: NetworkTopNFlowSortField;
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
    ip,
    isInspect,
    limit,
    loading,
    loadPage,
    setIpDetailsTablesActivePageToZero,
    showMorePagesIndicator,
    topCountriesSort,
    totalCount,
    type,
    updateIpDetailsTableActivePage,
    updateTopCountriesLimit,
    updateTopCountriesSort,
    updateNetworkPageTableActivePage,
  }) => {
    useEffect(() => {
      setIpDetailsTablesActivePageToZero(null);
    }, [ip]);
    const onChange = (criteria: Criteria, tableType: networkModel.TopCountriesTableType) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const field = last(splitField);
        const newSortDirection =
          field !== topCountriesSort.field ? Direction.desc : criteria.sort.direction; // sort by desc on init click
        const newTopCountriesSort: NetworkTopNFlowSortField = {
          field: field as NetworkTopNFlowFields,
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
      topCountriesSort.field === NetworkTopNFlowFields.bytes_out ||
      topCountriesSort.field === NetworkTopNFlowFields.bytes_in
        ? `node.network.${topCountriesSort.field}`
        : `node.${flowTargeted}.${topCountriesSort.field}`;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getNetworkTopCountriesColumns(
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
  networkSelectors.topCountriesSelector(ownProps.flowTargeted);

export const NetworkTopCountriesTable = connect(
  mapStateToProps,
  {
    setIpDetailsTablesActivePageToZero: networkActions.setIpDetailsTablesActivePageToZero,
    updateTopCountriesLimit: networkActions.updateTopCountriesLimit,
    updateTopCountriesSort: networkActions.updateTopCountriesSort,
    updateNetworkPageTableActivePage: networkActions.updateNetworkPageTableActivePage,
    updateIpDetailsTableActivePage: networkActions.updateIpDetailsTableActivePage,
  }
)(NetworkTopCountriesTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

SelectTypeItem.displayName = 'SelectTypeItem';
