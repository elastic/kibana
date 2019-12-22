/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { networkActions } from '../../../../store/network';
import {
  Direction,
  FlowTarget,
  UsersEdges,
  UsersFields,
  UsersSortField,
} from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, PaginatedTable, SortingBasicTable } from '../../../paginated_table';

import { getUsersColumns } from './columns';
import * as i18n from './translations';
import { assertUnreachable } from '../../../../lib/helpers';
const tableType = networkModel.IpDetailsTableType.users;

interface OwnProps {
  data: UsersEdges[];
  flowTarget: FlowTarget;
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

type UsersTableProps = OwnProps & UsersTableReduxProps;

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

export const usersTableId = 'users-table';

const UsersTableComponent = React.memo<UsersTableProps>(
  ({
    activePage,
    data,
    fakeTotalCount,
    flowTarget,
    id,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    totalCount,
    type,
    updateNetworkTable,
    sort,
  }) => {
    const updateLimitPagination = useCallback(
      newLimit =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        }),
      [type, updateNetworkTable]
    );

    const updateActivePage = useCallback(
      newPage =>
        updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        }),
      [type, updateNetworkTable]
    );

    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const splitField = criteria.sort.field.split('.');
          const newUsersSort: UsersSortField = {
            field: getSortFromString(splitField[splitField.length - 1]),
            direction: criteria.sort.direction as Direction,
          };
          if (!isEqual(newUsersSort, sort)) {
            updateNetworkTable({
              networkType: type,
              tableType,
              updates: { sort: newUsersSort },
            });
          }
        }
      },
      [sort, type, updateNetworkTable]
    );

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getUsersColumns(flowTarget, usersTableId)}
        dataTestSubj={`table-${tableType}`}
        showMorePagesIndicator={showMorePagesIndicator}
        headerCount={totalCount}
        headerTitle={i18n.USERS}
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

UsersTableComponent.displayName = 'UsersTableComponent';

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  return (state: State) => ({
    ...getUsersSelector(state),
  });
};

const connector = connect(makeMapStateToProps, {
  updateNetworkTable: networkActions.updateNetworkTable,
});

type UsersTableReduxProps = ConnectedProps<typeof connector>;

export const UsersTable = connector(UsersTableComponent);

const getSortField = (sortField: UsersSortField): SortingBasicTable => {
  switch (sortField.field) {
    case UsersFields.name:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
    case UsersFields.count:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
  }
  return assertUnreachable(sortField.field);
};

const getSortFromString = (sortField: string): UsersFields => {
  switch (sortField) {
    case UsersFields.name.valueOf():
      return UsersFields.name;
    case UsersFields.count.valueOf():
      return UsersFields.count;
    default:
      return UsersFields.name;
  }
};
