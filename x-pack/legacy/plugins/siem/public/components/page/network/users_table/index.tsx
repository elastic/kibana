/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';

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
  usersSortField: UsersSortField;
}

interface UsersTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    tableType: networkModel.IpDetailsTableType;
  }>;
  updateUsersLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateUsersSort: ActionCreator<{
    usersSort: UsersSortField;
    networkType: networkModel.NetworkType;
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

class UsersTableComponent extends React.PureComponent<UsersTableProps> {
  public render() {
    const {
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
      updateTableActivePage,
      updateUsersLimit,
      usersSortField,
    } = this.props;

    return (
      <PaginatedTable
        activePage={activePage}
        columns={getUsersColumns(flowTarget, usersTableId)}
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
        onChange={this.onChange}
        pageOfItems={data}
        sorting={getSortField(usersSortField)}
        totalCount={fakeTotalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            tableType,
          })
        }
        updateLimitPagination={newLimit => updateUsersLimit({ limit: newLimit, networkType: type })}
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newUsersSort: UsersSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newUsersSort, this.props.usersSortField)) {
        this.props.updateUsersSort({
          usersSortField: newUsersSort,
          networkType: this.props.type,
        });
      }
    }
  };
}

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  return (state: State) => ({
    ...getUsersSelector(state),
  });
};

export const UsersTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: networkActions.updateIpDetailsTableActivePage,
    updateUsersLimit: networkActions.updateUsersLimit,
    updateUsersSort: networkActions.updateUsersSort,
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
