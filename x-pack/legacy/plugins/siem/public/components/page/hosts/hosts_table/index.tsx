/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';
import { hostsActions } from '../../../../store/actions';
import {
  Direction,
  HostFields,
  HostItem,
  HostsEdges,
  HostsFields,
  HostsSortField,
  OsFields,
} from '../../../../graphql/types';
import { assertUnreachable } from '../../../../lib/helpers';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../paginated_table';

import { getHostsColumns } from './columns';
import * as i18n from './translations';

const tableType = hostsModel.HostsTableType.hosts;

interface OwnProps {
  data: HostsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  indexPattern: StaticIndexPattern;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

interface HostsTableReduxProps {
  activePage: number;
  limit: number;
  sortField: HostsFields;
  direction: Direction;
}

interface HostsTableDispatchProps {
  updateHostsSort: ActionCreator<{
    sort: HostsSortField;
    hostsType: hostsModel.HostsType;
  }>;
  updateTableActivePage: ActionCreator<{
    activePage: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
  updateTableLimit: ActionCreator<{
    limit: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
}

export type HostsTableColumns = [
  Columns<HostFields['name']>,
  Columns<HostItem['lastSeen']>,
  Columns<OsFields['name']>,
  Columns<OsFields['version']>
];

type HostsTableProps = OwnProps & HostsTableReduxProps & HostsTableDispatchProps;

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

class HostsTableComponent extends React.PureComponent<HostsTableProps> {
  private memoizedColumns: (
    type: hostsModel.HostsType,
    indexPattern: StaticIndexPattern
  ) => HostsTableColumns;
  private memoizedSorting: (
    trigger: string,
    sortField: HostsFields,
    direction: Direction
  ) => SortingBasicTable;

  constructor(props: HostsTableProps) {
    super(props);
    this.memoizedColumns = memoizeOne(this.getMemoizeHostsColumns);
    this.memoizedSorting = memoizeOne(this.getSorting);
  }

  public render() {
    const {
      activePage,
      data,
      direction,
      fakeTotalCount,
      id,
      isInspect,
      indexPattern,
      limit,
      loading,
      loadPage,
      showMorePagesIndicator,
      totalCount,
      sortField,
      type,
      updateTableActivePage,
      updateTableLimit,
    } = this.props;
    return (
      <PaginatedTable
        activePage={activePage}
        columns={this.memoizedColumns(type, indexPattern)}
        dataTestSubj="all-hosts"
        headerCount={totalCount}
        headerTitle={i18n.HOSTS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={this.onChange}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={this.memoizedSorting(`${sortField}-${direction}`, sortField, direction)}
        totalCount={fakeTotalCount}
        updateLimitPagination={newLimit =>
          updateTableLimit({
            hostsType: type,
            limit: newLimit,
            tableType,
          })
        }
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            hostsType: type,
            tableType,
          })
        }
      />
    );
  }

  private getSorting = (
    trigger: string,
    sortField: HostsFields,
    direction: Direction
  ): SortingBasicTable => ({ field: getNodeField(sortField), direction });

  private getMemoizeHostsColumns = (
    type: hostsModel.HostsType,
    indexPattern: StaticIndexPattern
  ): HostsTableColumns => getHostsColumns(type, indexPattern);

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const sort: HostsSortField = {
        field: getSortField(criteria.sort.field),
        direction: criteria.sort.direction,
      };
      if (sort.direction !== this.props.direction || sort.field !== this.props.sortField) {
        this.props.updateHostsSort({
          sort,
          hostsType: this.props.type,
        });
      }
    }
  };
}

const getSortField = (field: string): HostsFields => {
  switch (field) {
    case 'node.host.name':
      return HostsFields.hostName;
    case 'node.lastSeen':
      return HostsFields.lastSeen;
    default:
      return HostsFields.lastSeen;
  }
};

const getNodeField = (field: HostsFields): string => {
  switch (field) {
    case HostsFields.hostName:
      return 'node.host.name';
    case HostsFields.lastSeen:
      return 'node.lastSeen';
  }
  assertUnreachable(field);
};

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getHostsSelector(state, type);
  };
  return mapStateToProps;
};

export const HostsTable = connect(
  makeMapStateToProps,
  {
    updateHostsSort: hostsActions.updateHostsSort,
    updateTableActivePage: hostsActions.updateTableActivePage,
    updateTableLimit: hostsActions.updateTableLimit,
  }
)(HostsTableComponent);
