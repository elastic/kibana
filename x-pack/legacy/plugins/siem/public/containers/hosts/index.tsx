/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  Direction,
  GetHostsTableQuery,
  HostsEdges,
  HostsFields,
  PageInfo,
} from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { HostsTableQuery } from './hosts_table.gql_query';

export { HostsFilter } from './filter';

const ID = 'hostsQuery';

export interface HostsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  hosts: HostsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
}

export interface HostsComponentReduxProps {
  isInspected: boolean;
  limit: number;
  sortField: HostsFields;
  direction: Direction;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

class HostsComponentQuery extends QueryTemplate<
  HostsProps,
  GetHostsTableQuery.Query,
  GetHostsTableQuery.Variables
> {
  private memoizedHosts: (
    variables: string,
    data: GetHostsTableQuery.Source | undefined
  ) => HostsEdges[];

  constructor(props: HostsProps) {
    super(props);
    this.memoizedHosts = memoizeOne(this.getHosts);
  }

  public render() {
    const {
      id = ID,
      isInspected,
      children,
      direction,
      filterQuery,
      endDate,
      limit,
      startDate,
      skip,
      sourceId,
      sortField,
    } = this.props;

    const variables: GetHostsTableQuery.Variables = {
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      sort: {
        direction,
        field: sortField,
      },
      pagination: {
        limit,
        cursor: null,
        tiebreaker: null,
      },
      filterQuery: createFilter(filterQuery),
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      inspect: isInspected,
    };
    return (
      <Query<GetHostsTableQuery.Query, GetHostsTableQuery.Variables>
        query={HostsTableQuery}
        fetchPolicy="cache-first"
        notifyOnNetworkStatusChange
        variables={variables}
        skip={skip}
      >
        {({ data, loading, fetchMore, refetch }) => {
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                limit: limit + parseInt(newCursor, 10),
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
                  Hosts: {
                    ...fetchMoreResult.source.Hosts,
                    edges: [...prev.source.Hosts.edges, ...fetchMoreResult.source.Hosts.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            inspect: getOr(null, 'source.Hosts.inspect', data),
            refetch,
            loading,
            totalCount: getOr(0, 'source.Hosts.totalCount', data),
            hosts: this.memoizedHosts(JSON.stringify(variables), get('source', data)),
            startDate,
            endDate,
            pageInfo: getOr({}, 'source.Hosts.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }

  private getHosts = (
    variables: string,
    source: GetHostsTableQuery.Source | undefined
  ): HostsEdges[] => getOr([], 'Hosts.edges', source);
}

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getHostsSelector(state, type),
      isInspected,
    };
  };
  return mapStateToProps;
};

export const HostsQuery = connect(makeMapStateToProps)(HostsComponentQuery);
