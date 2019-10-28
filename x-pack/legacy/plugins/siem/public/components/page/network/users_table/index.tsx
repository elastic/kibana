/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { networkActions } from '../../../../store/network';
import { FlowTarget, UsersEdges, UsersFields, UsersSortField } from '../../../../graphql/types';
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

interface UsersTableReduxProps {
  activePage: number;
  limit: number;
  sort: UsersSortField;
}

interface UsersTableDispatchProps {
  updateNetworkTable: ActionCreator<{
    networkType: networkModel.NetworkType;
    tableType: networkModel.AllNetworkTables;
    updates: networkModel.TableUpdates;
  }>;
}

type UsersTableProps = OwnProps & UsersTableReduxProps & UsersTableDispatchProps;

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
    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const splitField = criteria.sort.field.split('.');
          const newUsersSort: UsersSortField = {
            field: getSortFromString(splitField[splitField.length - 1]),
            direction: criteria.sort.direction,
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
      [sort, type]
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
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={onChange}
        pageOfItems={data}
        sorting={getSortField(sort)}
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

UsersTableComponent.displayName = 'UsersTableComponent';

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  return (state: State) => ({
    ...getUsersSelector(state),
  });
};

export const UsersTable = connect(
  makeMapStateToProps,
  {
    updateNetworkTable: networkActions.updateNetworkTable,
  }
)(UsersTableComponent);

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
