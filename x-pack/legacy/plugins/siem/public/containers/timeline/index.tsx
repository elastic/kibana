/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React from 'react';

import chrome from 'ui/chrome';
import { connect } from 'react-redux';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  GetTimelineQuery,
  GetTimelineQueryComponent,
  PageInfo,
  SortField,
  TimelineEdges,
  TimelineItem,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';

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

export interface OwnProps extends QueryTemplateProps {
  children?: (args: TimelineArgs) => React.ReactElement;
  id: string;
  indexPattern?: IIndexPattern;
  limit: number;
  sortField: SortField;
  fields: string[];
}
type TimelineQueryProps = OwnProps & TimelineQueryReduxProps;

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
      id,
      indexPattern,
      isInspected,
      limit,
      fields,
      filterQuery,
      sourceId,
      sortField,
    } = this.props;
    const variables: GetTimelineQuery.Variables = {
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      pagination: { limit, cursor: null, tiebreaker: null },
      sortField,
      defaultIndex:
        indexPattern?.title.split(',') ?? chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      inspect: isInspected,
    };
    return (
      <GetTimelineQueryComponent
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
        variables={variables}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const timelineEdges = getOr([], 'source.Timeline.edges', data);
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
            refetch,
            loading,
            totalCount: getOr(0, 'source.Timeline.totalCount', data),
            pageInfo: getOr({}, 'source.Timeline.pageInfo', data),
            events: this.memoizedTimelineEvents(JSON.stringify(variables), timelineEdges),
            loadMore: this.wrappedLoadMore,
            getUpdatedAt: this.getUpdatedAt,
          });
        }}
      </GetTimelineQueryComponent>
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

export const TimelineQuery = connect(makeMapStateToProps)(TimelineQueryComponent);
