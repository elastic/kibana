/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { networkActions } from '../../../../store/network';
import { TlsEdges, TlsSortField, TlsFields, Direction } from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable, SortingBasicTable } from '../../../paginated_table';
import { getTlsColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: TlsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

type TlsTableProps = OwnProps & PropsFromRedux;

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

export const tlsTableId = 'tls-table';

const TlsTableComponent = React.memo<TlsTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    id,
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
    const tableType: networkModel.TopTlsTableType =
      type === networkModel.NetworkType.page
        ? networkModel.NetworkTableType.tls
        : networkModel.IpDetailsTableType.tls;

    const updateLimitPagination = useCallback(
      newLimit =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        }),
      [type, updateNetworkTable, tableType]
    );

    const updateActivePage = useCallback(
      newPage =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        }),
      [type, updateNetworkTable, tableType]
    );

    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const splitField = criteria.sort.field.split('.');
          const newTlsSort: TlsSortField = {
            field: getSortFromString(splitField[splitField.length - 1]),
            direction: criteria.sort.direction as Direction,
          };
          if (!isEqual(newTlsSort, sort)) {
            updateNetworkTable({
              networkType: type,
              tableType,
              updates: { sort: newTlsSort },
            });
          }
        }
      },
      [sort, type, tableType, updateNetworkTable]
    );

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getTlsColumns(tlsTableId)}
        dataTestSubj={`table-${tableType}`}
        showMorePagesIndicator={showMorePagesIndicator}
        headerCount={totalCount}
        headerTitle={i18n.TRANSPORT_LAYER_SECURITY}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        onChange={onChange}
        pageOfItems={data}
        sorting={getSortField(sort)}
        totalCount={fakeTotalCount}
        updateActivePage={updateActivePage}
        updateLimitPagination={updateLimitPagination}
      />
    );
  }
);

TlsTableComponent.displayName = 'TlsTableComponent';

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  return (state: State, { type }: OwnProps) => getTlsSelector(state, type);
};

const mapDispatchToProps = {
  updateNetworkTable: networkActions.updateNetworkTable,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const TlsTable = connector(TlsTableComponent);

const getSortField = (sortField: TlsSortField): SortingBasicTable => ({
  field: `node.${sortField.field}`,
  direction: sortField.direction,
});

const getSortFromString = (sortField: string): TlsFields => {
  switch (sortField) {
    case '_id':
      return TlsFields._id;
    default:
      return TlsFields._id;
  }
};
