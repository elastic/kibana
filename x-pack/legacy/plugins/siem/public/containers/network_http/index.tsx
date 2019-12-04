/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { compose } from 'redux';
import chrome from 'ui/chrome';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  GetNetworkHttpQuery,
  NetworkHttpEdges,
  NetworkHttpSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, networkModel, networkSelectors, State } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { networkHttpQuery } from './index.gql_query';

const ID = 'networkHttpQuery';

export interface NetworkHttpArgs {
  id: string;
  ip?: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkHttp: NetworkHttpEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkHttpArgs) => React.ReactNode;
  ip?: string;
  type: networkModel.NetworkType;
}

export interface NetworkHttpComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  sort: NetworkHttpSortField;
}

type NetworkHttpProps = OwnProps & NetworkHttpComponentReduxProps;

class NetworkHttpComponentQuery extends QueryTemplatePaginated<
  NetworkHttpProps,
  GetNetworkHttpQuery.Query,
  GetNetworkHttpQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      id = ID,
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      sort,
      startDate,
    } = this.props;
    const variables: GetNetworkHttpQuery.Variables = {
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      inspect: isInspected,
      ip,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };
    return (
      <Query<GetNetworkHttpQuery.Query, GetNetworkHttpQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={networkHttpQuery}
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const networkHttp = getOr([], `source.NetworkHttp.edges`, data);
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
                  NetworkHttp: {
                    ...fetchMoreResult.source.NetworkHttp,
                    edges: [...fetchMoreResult.source.NetworkHttp.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.NetworkHttp.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            networkHttp,
            pageInfo: getOr({}, 'source.NetworkHttp.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.NetworkHttp.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getHttpSelector = networkSelectors.httpSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  return (state: State, { id = ID, type }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getHttpSelector(state, type),
      isInspected,
    };
  };
};

export const NetworkHttpQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps)
)(NetworkHttpComponentQuery);
