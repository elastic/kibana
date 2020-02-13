/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React from 'react';
import { Query } from 'react-apollo';
import { compose, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  GetTimelineQuery,
  PageInfo,
  SortField,
  TimelineEdges,
  TimelineItem,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../store';
import { withKibana, WithKibanaProps } from '../../lib/kibana';
import { createFilter } from '../helpers';
import { FetchMoreOptionsArgs, QueryTemplate, QueryTemplateProps } from '../query_template';
import { EventType } from '../../store/timeline/model';
import { timelineQuery } from './index.gql_query';
import { timelineActions } from '../../store/timeline';
import { SIGNALS_PAGE_TIMELINE_ID } from '../../pages/detection_engine/components/signals';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  getUpdatedAt: () => number;
}

export interface TimelineQueryReduxProps {
  isInspected: boolean;
}

interface DispatchProps {
  clearEventsDeleted?: ActionCreator<{ id: string }>;
  clearEventsLoading?: ActionCreator<{ id: string }>;
  clearSelected?: ActionCreator<{ id: string }>;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: TimelineArgs) => React.ReactNode;
  eventType?: EventType;
  id: string;
  indexPattern?: IIndexPattern;
  indexToAdd?: string[];
  limit: number;
  sortField: SortField;
  fields: string[];
}
type TimelineQueryProps = OwnProps & TimelineQueryReduxProps & DispatchProps & WithKibanaProps;

class TimelineQueryComponent extends QueryTemplate<
  TimelineQueryProps,
  GetTimelineQuery.Query,
  GetTimelineQuery.Variables
> {
  private updatedDate: number = Date.now();
  private memoizedTimelineEvents: (variables: string, events: TimelineEdges[]) => TimelineItem[];

  constructor(props: TimelineQueryProps) {
    super(props);
    this.memoizedTimelineEvents = memoizeOne(this.getTimelineEvents);
  }

  public render() {
    const {
      children,
      clearEventsDeleted,
      clearEventsLoading,
      eventType = 'raw',
      id,
      indexPattern,
      indexToAdd = [],
      isInspected,
      kibana,
      limit,
      fields,
      filterQuery,
      sourceId,
      sortField,
    } = this.props;
    const defaultKibanaIndex = kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
    const defaultIndex =
      indexPattern == null || (indexPattern != null && indexPattern.title === '')
        ? [
            ...(['all', 'raw'].includes(eventType) ? defaultKibanaIndex : []),
            ...(['all', 'signal'].includes(eventType) ? indexToAdd : []),
          ]
        : indexPattern?.title.split(',') ?? [];
    const variables: GetTimelineQuery.Variables = {
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      pagination: { limit, cursor: null, tiebreaker: null },
      sortField,
      defaultIndex,
      inspect: isInspected,
    };
    const clearSignalsState = () => {
      if (id === SIGNALS_PAGE_TIMELINE_ID) {
        clearEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID });
        clearEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID });
      }
    };
    return (
      <Query<GetTimelineQuery.Query, GetTimelineQuery.Variables>
        query={timelineQuery}
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
        variables={variables}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const wrappedRefetch = () => {
            clearSignalsState();
            return refetch();
          };
          const wrappedFetchMore = (
            fetchMoreOptions: FetchMoreOptionsArgs<
              GetTimelineQuery.Query,
              GetTimelineQuery.Variables
            >
          ) => {
            clearSignalsState();
            return fetchMore(fetchMoreOptions);
          };
          const wrappedLoadMore = (newCursor: string, tiebreaker?: string) => {
            clearSignalsState();
            return this.wrappedLoadMore(newCursor, tiebreaker);
          };
          const timelineEdges = getOr([], 'source.Timeline.edges', data);
          this.setFetchMore(wrappedFetchMore);
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
                  Timeline: {
                    ...fetchMoreResult.source.Timeline,
                    edges: [
                      ...prev.source.Timeline.edges,
                      ...fetchMoreResult.source.Timeline.edges,
                    ],
                  },
                },
              };
            },
          }));
          this.updatedDate = Date.now();
          return children!({
            id,
            inspect: getOr(null, 'source.Timeline.inspect', data),
            refetch: wrappedRefetch,
            loading,
            totalCount: getOr(0, 'source.Timeline.totalCount', data),
            pageInfo: getOr({}, 'source.Timeline.pageInfo', data),
            events: this.memoizedTimelineEvents(JSON.stringify(variables), timelineEdges),
            loadMore: wrappedLoadMore,
            getUpdatedAt: this.getUpdatedAt,
          });
        }}
      </Query>
    );
  }

  private getUpdatedAt = () => this.updatedDate;

  private getTimelineEvents = (variables: string, timelineEdges: TimelineEdges[]): TimelineItem[] =>
    timelineEdges.map((e: TimelineEdges) => e.node);
}

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(timelineActions.clearSelected({ id })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsLoading({ id })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsDeleted({ id })),
});

export const TimelineQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps, mapDispatchToProps),
  withKibana
)(TimelineQueryComponent);
