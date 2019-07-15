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
import { Direction, Ecs, GetEventsQuery, PageInfo } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { eventsQuery } from './index.gql_query';

const ID = 'eventsQuery';

export interface EventsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  events: Ecs[];
  loading: boolean;
  loadMore: (cursor: string, tiebreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: EventsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface EventsComponentReduxProps {
  isInspected: boolean;
  limit: number;
}

type EventsProps = OwnProps & EventsComponentReduxProps;

class EventsComponentQuery extends QueryTemplate<
  EventsProps,
  GetEventsQuery.Query,
  GetEventsQuery.Variables
> {
  public render() {
    const {
      children,
      filterQuery,
      id = ID,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <Query<GetEventsQuery.Query, GetEventsQuery.Variables>
        query={eventsQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          filterQuery: createFilter(filterQuery),
          sourceId,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          sortField: {
            sortFieldId: 'timestamp',
            direction: Direction.desc,
          },
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const events = getOr([], 'source.Events.edges', data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string, tiebreaker?: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                tiebreaker,
                limit,
              },
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
                    edges: [...prev.source.Events.edges, ...fetchMoreResult.source.Events.edges],
                  },
                },
              };
            },
          }));
          return children!({
            id,
            inspect: getOr(null, 'source.Events.inspect', data),
            refetch,
            loading,
            totalCount: getOr(0, 'source.Events.totalCount', data),
            pageInfo: getOr({}, 'source.Events.pageInfo', data),
            events,
            loadMore: this.wrappedLoadMore,
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
