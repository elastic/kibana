/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions } from '../../../../store/actions';
import { Ecs } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../paginated_table';
import { getRowItemDraggable, getRowItemDraggables, OverflowField } from '../../../tables/helpers';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';

import * as i18n from './translations';
const tableType = hostsModel.HostsTableType.events;
interface OwnProps {
  data: Ecs[];
  fakeTotalCount: number;
  id: string;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

interface EventsTableReduxProps {
  activePage: number;
  limit: number;
}

interface EventsTableDispatchProps {
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

export type EventsTableColumns = [
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>,
  Columns<Ecs>
];

type EventsTableProps = OwnProps & EventsTableReduxProps & EventsTableDispatchProps;

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

const EventsTableComponent = pure<EventsTableProps>(
  ({
    fakeTotalCount,
    showMorePagesIndicator,
    data,
    id,
    limit,
    loading,
    loadPage,
    totalCount,
    type,
    updateTableActivePage,
    updateTableLimit,
  }) => (
    <PaginatedTable
      columns={getEventsColumnsCurated(type)}
      headerCount={totalCount}
      headerTitle={i18n.EVENTS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={newActivePage => loadPage(newActivePage)}
      pageOfItems={data}
      showMorePagesIndicator={showMorePagesIndicator}
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
      updateProps={{ totalCount }}
    />
  )
);

EventsTableComponent.displayName = 'EventsTableComponent';

const makeMapStateToProps = () => {
  const getEventsSelector = hostsSelectors.eventsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getEventsSelector(state, type);
  };
  return mapStateToProps;
};

export const EventsTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: hostsActions.updateTableActivePage,
    updateTableLimit: hostsActions.updateTableLimit,
  }
)(EventsTableComponent);

const getEventsColumns = (pageType: hostsModel.HostsType): EventsTableColumns => [
  {
    field: 'node',
    name: i18n.TIMESTAMP,
    sortable: false,
    truncateText: false,
    render: ({ timestamp }) =>
      timestamp != null ? (
        <LocalizedDateTooltip date={moment(new Date(timestamp)).toDate()}>
          <PreferenceFormattedDate value={new Date(timestamp)} />
        </LocalizedDateTooltip>
      ) : (
        getEmptyTagValue()
      ),
    width: '15%',
  },
  {
    field: 'node',
    name: i18n.HOST_NAME,
    sortable: false,
    truncateText: false,
    render: node =>
      getRowItemDraggables({
        rowItems: getOr(null, 'host.name', node),
        attrName: 'host.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
    width: '15%',
  },
  {
    field: 'node',
    name: i18n.EVENT_MODULE_DATASET,
    sortable: false,
    truncateText: true,
    render: node => (
      <>
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.module', node),
          attrName: 'event.module',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
        {' / '}
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.dataset', node),
          attrName: 'event.dataset',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
      </>
    ),
  },
  {
    field: 'node',
    name: i18n.EVENT_ACTION,
    sortable: false,
    truncateText: true,
    render: node =>
      getRowItemDraggables({
        rowItems: getOr(null, 'event.action', node),
        attrName: 'event.action',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    field: 'node',
    name: i18n.USER,
    sortable: false,
    truncateText: true,
    render: node =>
      getRowItemDraggables({
        rowItems: getOr(null, 'user.name', node),
        attrName: 'user.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    field: 'node',
    name: i18n.SOURCE,
    sortable: false,
    truncateText: true,
    render: node => (
      <>
        {getRowItemDraggable({
          rowItem: getOr(null, 'source.ip[0]', node),
          attrName: 'source.ip',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
          render: item => <IPDetailsLink ip={item} />,
        })}
        {':'}
        {getOrEmptyTag('source.port', node)}
      </>
    ),
  },
  {
    field: 'node',
    name: i18n.DESTINATION,
    sortable: false,
    truncateText: true,
    render: node => (
      <>
        {getRowItemDraggable({
          rowItem: getOr(null, 'destination.ip[0]', node),
          attrName: 'destination.ip',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
          render: item => <IPDetailsLink ip={item} />,
        })}
        {':'}
        {getOrEmptyTag('destination.port', node)}
      </>
    ),
  },
  {
    field: 'node',
    name: i18n.MESSAGE,
    sortable: false,
    truncateText: true,
    width: '15%',
    render: node => {
      const message = getOr(null, 'message[0]', node);
      return message != null ? (
        <OverflowField value={message} showToolTip={false} />
      ) : (
        getEmptyTagValue()
      );
    },
  },
];

export const getEventsColumnsCurated = (pageType: hostsModel.HostsType) => {
  const columns = getEventsColumns(pageType);

  // Columns to exclude from host details pages
  if (pageType === hostsModel.HostsType.details) {
    return [i18n.HOST_NAME].reduce((acc, name) => {
      acc.splice(acc.findIndex(column => column.name === name), 1);
      return acc;
    }, columns);
  }

  return columns;
};
