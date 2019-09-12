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
import {
  GetNetworkDnsQuery,
  NetworkDnsEdges,
  NetworkDnsSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { networkDnsQuery } from './index.gql_query';

const ID = 'networkDnsQuery';

export interface NetworkDnsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkDns: NetworkDnsEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkDnsArgs) => React.ReactNode;
  type: networkModel.NetworkType;
}

export interface NetworkDnsComponentReduxProps {
  activePage: number;
  dnsSortField: NetworkDnsSortField;
  isInspected: boolean;
  isPtrIncluded: boolean;
  limit: number;
}

type NetworkDnsProps = OwnProps & NetworkDnsComponentReduxProps;

class NetworkDnsComponentQuery extends QueryTemplatePaginated<
  NetworkDnsProps,
  GetNetworkDnsQuery.Query,
  GetNetworkDnsQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      dnsSortField,
      endDate,
      filterQuery,
      id = ID,
      isInspected,
      isPtrIncluded,
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    const variables: GetNetworkDnsQuery.Variables = {
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      inspect: isInspected,
      isPtrIncluded,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort: dnsSortField,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };

    return (
      <Query<GetNetworkDnsQuery.Query, GetNetworkDnsQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={networkDnsQuery}
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const networkDns = getOr([], `source.NetworkDns.edges`, data);
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
                  NetworkDns: {
                    ...fetchMoreResult.source.NetworkDns,
                    edges: [...fetchMoreResult.source.NetworkDns.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.NetworkDns.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            networkDns,
            pageInfo: getOr({}, 'source.NetworkDns.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.NetworkDns.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getNetworkDnsSelector(state),
      isInspected,
    };
  };

  return mapStateToProps;
};

export const NetworkDnsQuery = connect(makeMapStateToProps)(NetworkDnsComponentQuery);
