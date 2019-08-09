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
  PageInfoPaginated,
} from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

import { HostsTableQuery } from './hosts_table.gql_query';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';

export { HostsFilter } from './filter';

const ID = 'hostsQuery';

export interface HostsArgs {
  endDate: number;
  hosts: HostsEdges[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: HostsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
}

export interface HostsComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  sortField: HostsFields;
  direction: Direction;
}

type HostsProps = OwnProps & HostsComponentReduxProps;

class HostsComponentQuery extends QueryTemplatePaginated<
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
      activePage,
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
      pagination: generateTablePaginationOptions(activePage, limit),
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
                  Hosts: {
                    ...fetchMoreResult.source.Hosts,
                    edges: [...fetchMoreResult.source.Hosts.edges],
                  },
                },
              };
            },
          }));
          return children({
            endDate,
            hosts: this.memoizedHosts(JSON.stringify(variables), get('source', data)),
            id,
            inspect: getOr(null, 'source.Hosts.inspect', data),
            loading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Hosts.pageInfo', data),
            refetch,
            startDate,
            totalCount: getOr(-1, 'source.Hosts.totalCount', data),
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
