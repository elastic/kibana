/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { Direction, Ecs, GetEventsQuery, PageInfoPaginated } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { eventsQuery } from './index.gql_query';

const ID = 'eventsQuery';

export interface EventsArgs {
  events: Ecs[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children?: (args: EventsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface EventsComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
}

type EventsProps = OwnProps & EventsComponentReduxProps;

class EventsComponentQuery extends QueryTemplatePaginated<
  EventsProps,
  GetEventsQuery.Query,
  GetEventsQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      id = ID,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    return (
      <Query<GetEventsQuery.Query, GetEventsQuery.Variables>
        query={eventsQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          filterQuery: createFilter(filterQuery),
          inspect: isInspected,
          pagination: generateTablePaginationOptions(activePage, limit),
          sortField: {
            sortFieldId: 'timestamp',
            direction: Direction.desc,
          },
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const events = getOr([], 'source.Events.edges', data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newActivePage: number) => ({
            variables: {
              pagination: generateTablePaginationOptions(newActivePage, limit),
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) {
                return prev;
              }
              return {
                ...fetchMoreResult,
                source: {
                  ...fetchMoreResult.source,
                  Events: {
                    ...fetchMoreResult.source.Events,
                    edges: [...fetchMoreResult.source.Events.edges],
                  },
                },
              };
            },
          }));
          return children!({
            events,
            id,
            inspect: getOr(null, 'source.Events.inspect', data),
            loading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Events.pageInfo', data),
            refetch,
            totalCount: getOr(0, 'source.Events.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getEventsSelector = hostsSelectors.eventsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getEventsSelector(state, type),
      isInspected,
    };
  };
  return mapStateToProps;
};

export const EventsQuery = connect(makeMapStateToProps)(EventsComponentQuery);
