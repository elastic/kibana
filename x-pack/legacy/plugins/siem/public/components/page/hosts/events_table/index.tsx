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
import { Ecs, EcsEdges } from '../../../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../../../store';
import { getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { getRowItemDraggable, getRowItemDraggables, OverflowField } from '../../../tables/helpers';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';

import * as i18n from './translations';

interface OwnProps {
  data: Ecs[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  tiebreaker: string;
  totalCount: number;
  loadMore: (cursor: string, tiebreaker: string) => void;
  type: hostsModel.HostsType;
}

interface EventsTableReduxProps {
  limit: number;
}

interface EventsTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
}

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
  {
    text: i18n.ROWS_20,
    numberOfRow: 20,
  },
  {
    text: i18n.ROWS_50,
    numberOfRow: 50,
  },
];

const EventsTableComponent = pure<EventsTableProps>(
  ({
    data,
    hasNextPage,
    limit,
    loading,
    loadMore,
    tiebreaker,
    totalCount,
    nextCursor,
    updateLimitPagination,
    type,
  }) => (
    <LoadMoreTable
      columns={getEventsColumnsCurated(type)}
      hasNextPage={hasNextPage}
      headerCount={totalCount}
      headerTitle={i18n.EVENTS}
      headerUnit={i18n.UNIT(totalCount)}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadingTitle={i18n.EVENTS}
      loadMore={() => loadMore(nextCursor, tiebreaker)}
      pageOfItems={data}
      updateLimitPagination={newLimit =>
        updateLimitPagination({ limit: newLimit, hostsType: type })
      }
    />
  )
);

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
    updateLimitPagination: hostsActions.updateEventsLimit,
  }
)(EventsTableComponent);

const getEventsColumns = (
  pageType: hostsModel.HostsType
): [
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>,
  Columns<EcsEdges>
] => [
  {
    name: i18n.TIMESTAMP,
    sortable: false,
    truncateText: false,
    render: ({ node }) =>
      node.timestamp != null ? (
        <LocalizedDateTooltip date={moment(new Date(node.timestamp)).toDate()}>
          <PreferenceFormattedDate value={new Date(node.timestamp)} />
        </LocalizedDateTooltip>
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    name: i18n.HOST_NAME,
    sortable: false,
    truncateText: false,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'host.name', node),
        attrName: 'host.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.EVENT_MODULE_DATASET,
    sortable: false,
    truncateText: true,
    render: ({ node }) => (
      <>
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.module', node),
          attrName: 'event.module',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
        {'/'}
        {getRowItemDraggables({
          rowItems: getOr(null, 'event.dataset', node),
          attrName: 'event.dataset',
          idPrefix: `host-${pageType}-events-table-${node._id}`,
        })}
      </>
    ),
  },
  {
    name: i18n.EVENT_ACTION,
    sortable: false,
    truncateText: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'event.action', node),
        attrName: 'event.action',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.USER,
    sortable: false,
    truncateText: true,
    render: ({ node }) =>
      getRowItemDraggables({
        rowItems: getOr(null, 'user.name', node),
        attrName: 'user.name',
        idPrefix: `host-${pageType}-events-table-${node._id}`,
      }),
  },
  {
    name: i18n.SOURCE,
    sortable: false,
    truncateText: true,
    render: ({ node }) => (
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
    name: i18n.DESTINATION,
    sortable: false,
    truncateText: true,
    render: ({ node }) => (
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
    name: i18n.MESSAGE,
    sortable: false,
    truncateText: true,
    width: '25%',
    render: ({ node }) => {
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
  if (pageType === 'details') {
    return [i18n.HOST_NAME].reduce((acc, name) => {
      acc.splice(acc.findIndex(column => column.name === name), 1);
      return acc;
    }, columns);
  }

  return columns;
};
