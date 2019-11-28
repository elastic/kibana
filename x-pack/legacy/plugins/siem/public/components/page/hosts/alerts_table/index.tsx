/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';
import { hostsActions } from '../../../../store/actions';
import {
  Direction,
  HostFields,
  AlertsFields,
  AlertsSortField,
  AlertsItem,
  EventEcsFields,
  SourceFields,
} from '../../../../graphql/types';
import { assertUnreachable } from '../../../../lib/helpers';
import { hostsModel, hostsSelectors, State, inputsSelectors } from '../../../../store';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../paginated_table';

import { getAlertsColumns } from './columns';
import * as i18n from './translations';

const ID = 'alertsQuery';
const tableType = hostsModel.HostsTableType.hosts;

interface OwnProps {
  data: AlertsItem[];
  fakeTotalCount: number;
  id: string;
  indexPattern: StaticIndexPattern;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

interface AlertsTableReduxProps {
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: AlertsFields;
}

interface AlertsTableDispatchProps {
  updateAlertsSort: ActionCreator<{
    hostsType: hostsModel.HostsType;
    sort: AlertsSortField;
  }>;
  updateTableActivePage: ActionCreator<{
    activePage: number;
    hostsType: hostsModel.HostsType;
    tableType: hostsModel.HostsTableType;
  }>;
  updateTableLimit: ActionCreator<{
    hostsType: hostsModel.HostsType;
    limit: number;
    tableType: hostsModel.HostsTableType;
  }>;
}

export type AlertsTableColumns = [
  Columns<SourceFields['timestamp']>,
  Columns<EventEcsFields['module']>,
  Columns<EventEcsFields['dataset']>,
  Columns<EventEcsFields['category']>,
  Columns<EventEcsFields['severity']>,
  Columns<HostFields['name']>,
  Columns<SourceFields['message']>
];

type AlertsTableProps = OwnProps & AlertsTableReduxProps & AlertsTableDispatchProps;

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
const getSorting = (
  trigger: string,
  sortField: AlertsFields,
  direction: Direction
): SortingBasicTable => ({ field: getNodeField(sortField), direction });

const AlertsTableComponent = React.memo<AlertsTableProps>(
  ({
    activePage,
    data,
    direction,
    fakeTotalCount,
    id,
    indexPattern,
    isInspect,
    limit,
    loading,
    loadPage,
    showMorePagesIndicator,
    sortField,
    totalCount,
    type,
    updateAlertsSort,
    updateTableActivePage,
    updateTableLimit,
  }) => {
    const onChange = useCallback(
      (criteria: Criteria) => {
        if (criteria.sort != null) {
          const sort: AlertsSortField = {
            field: getSortField(criteria.sort.field),
            direction: criteria.sort.direction,
          };
          if (sort.direction !== direction || sort.field !== sortField) {
            updateAlertsSort({
              sort,
              hostsType: type,
            });
          }
        }
      },
      [direction, sortField, type]
    );

    const alertsColumns = useMemo(() => getAlertsColumns(), []);

    const sorting = useMemo(() => getSorting(`${sortField}-${direction}`, sortField, direction), [
      sortField,
      direction,
    ]);

    return (
      <PaginatedTable
        activePage={activePage}
        columns={alertsColumns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.ALERTS}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={newActivePage => loadPage(newActivePage)}
        onChange={onChange}
        pageOfItems={data}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={sorting}
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
);

AlertsTableComponent.displayName = 'AlertsTableComponent';

const getSortField = (field: string): AlertsFields => {
  switch (field) {
    case 'node.host.name':
      return AlertsFields.hostName;
    default:
      return AlertsFields.hostName;
  }
};

const getNodeField = (field: AlertsFields): string => {
  switch (field) {
    case AlertsFields.hostName:
      return 'node.host.name';
  }
  assertUnreachable(field);
};

const makeMapStateToProps = () => {
  const getAlertsSelector = hostsSelectors.alertsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getAlertsSelector(state, type),
      isInspected,
    };
  };
  return mapStateToProps;
};

export const AlertsTable = connect(makeMapStateToProps, {
  updateAlertsSort: hostsActions.updateAlertsSort,
  updateTableActivePage: hostsActions.updateTableActivePage,
  updateTableLimit: hostsActions.updateTableLimit,
})(AlertsTableComponent);
