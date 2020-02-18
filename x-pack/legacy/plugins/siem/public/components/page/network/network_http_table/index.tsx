/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { networkActions } from '../../../../store/actions';
import { Direction, NetworkHttpEdges, NetworkHttpFields } from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable } from '../../../paginated_table';

import { getNetworkHttpColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkHttpEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

type NetworkHttpTableProps = OwnProps & PropsFromRedux;

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

const NetworkHttpTableComponent: React.FC<NetworkHttpTableProps> = ({
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
  const tableType =
    type === networkModel.NetworkType.page
      ? networkModel.NetworkTableType.http
      : networkModel.IpDetailsTableType.http;

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
      if (criteria.sort != null && criteria.sort.direction !== sort.direction) {
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: {
            sort: {
              direction: criteria.sort.direction as Direction,
            },
          },
        });
      }
    },
    [tableType, sort.direction, type, updateNetworkTable]
  );

  const sorting = { field: `node.${NetworkHttpFields.requestCount}`, direction: sort.direction };

  return (
    <PaginatedTable
      activePage={activePage}
      columns={getNetworkHttpColumns(tableType)}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={i18n.HTTP_REQUESTS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      itemsPerRow={rowItems}
      isInspect={isInspect}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onChange}
      pageOfItems={data}
      showMorePagesIndicator={showMorePagesIndicator}
      sorting={sorting}
      totalCount={fakeTotalCount}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
};

NetworkHttpTableComponent.displayName = 'NetworkHttpTableComponent';

const makeMapStateToProps = () => {
  const getNetworkHttpSelector = networkSelectors.httpSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => getNetworkHttpSelector(state, type);
  return mapStateToProps;
};

const mapDispatchToProps = {
  updateNetworkTable: networkActions.updateNetworkTable,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const NetworkHttpTable = connector(React.memo(NetworkHttpTableComponent));
