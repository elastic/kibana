/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React from 'react';
import { Query } from 'react-apollo';

import chrome from 'ui/chrome';
import { connect } from 'react-redux';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  GetAlertsQuery,
  PageInfo,
  TimelineItem,
  SortField,
  TimelineEdges,
} from '../../graphql/types';
import { inputsModel, State, inputsSelectors } from '../../store';
import { createFilter } from '../helpers';

import { alertsQuery } from './index.gql_query';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

export interface AlertsArgs {
  alerts: TimelineItem[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  getUpdatedAt: () => number;
}

export interface AlertsComponentReduxProps {
  isInspected: boolean;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: AlertsArgs) => React.ReactNode;
  id: string;
  limit: number;
  sortField: SortField;
  fields: string[];
}
type AlertsQueryProps = OwnProps & AlertsComponentReduxProps;

class AlertsQueryComponent extends QueryTemplate<
  AlertsQueryProps,
  GetAlertsQuery.Query,
  GetAlertsQuery.Variables
> {
  private updatedDate: number = Date.now();
  private memoizedAlerts: (variables: string, data: TimelineEdges[]) => TimelineItem[];

  constructor(props: AlertsQueryProps) {
    super(props);
    this.memoizedAlerts = memoizeOne(this.getAlerts);
  }

  public render() {
    const {
      children,
      id,
      isInspected,
      limit,
      fields,
      filterQuery,
      sourceId,
      sortField,
    } = this.props;
    const variables: GetAlertsQuery.Variables = {
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      pagination: { limit, cursor: null, tiebreaker: null },
      sortField,
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      inspect: isInspected,
    };
    return (
      <Query<GetAlertsQuery.Query, GetAlertsQuery.Variables>
        query={alertsQuery}
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
        variables={variables}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const alertsEdges = getOr([], 'source.Alerts.edges', data);
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
                  Alerts: {
                    ...fetchMoreResult.source.Alerts,
                    edges: [...prev.source.Alerts.edges, ...fetchMoreResult.source.Alerts.edges],
                  },
                },
              };
            },
          }));
          this.updatedDate = Date.now();
          return children!({
            id,
            inspect: getOr(null, 'source.Alerts.inspect', data),
            refetch,
            loading,
            totalCount: getOr(0, 'source.Alerts.totalCount', data),
            pageInfo: getOr({}, 'source.Alerts.pageInfo', data),
            alerts: this.memoizedAlerts(JSON.stringify(variables), alertsEdges),
            loadMore: this.wrappedLoadMore,
            getUpdatedAt: this.getUpdatedAt,
          });
        }}
      </Query>
    );
  }

  private getUpdatedAt = () => this.updatedDate;

  private getAlerts = (variables: string, timelineEdges: TimelineEdges[]): TimelineItem[] =>
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

export const AlertsQuery = connect(makeMapStateToProps)(AlertsQueryComponent);
