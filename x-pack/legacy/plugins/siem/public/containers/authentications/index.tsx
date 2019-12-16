/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  AuthenticationsEdges,
  GetAuthenticationsQuery,
  PageInfoPaginated,
} from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { useUiSetting } from '../../lib/kibana';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

import { authenticationsQuery } from './index.gql_query';

const ID = 'authenticationQuery';

export interface AuthenticationArgs {
  authentications: AuthenticationsEdges[];
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: AuthenticationArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface AuthenticationsComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
}

type AuthenticationsProps = OwnProps & AuthenticationsComponentReduxProps;

class AuthenticationsComponentQuery extends QueryTemplatePaginated<
  AuthenticationsProps,
  GetAuthenticationsQuery.Query,
  GetAuthenticationsQuery.Variables
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
    const variables: GetAuthenticationsQuery.Variables = {
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
      pagination: generateTablePaginationOptions(activePage, limit),
      filterQuery: createFilter(filterQuery),
      defaultIndex: useUiSetting<string[]>(DEFAULT_INDEX_KEY),
      inspect: isInspected,
    };
    return (
      <Query<GetAuthenticationsQuery.Query, GetAuthenticationsQuery.Variables>
        query={authenticationsQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const authentications = getOr([], 'source.Authentications.edges', data);
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
                  Authentications: {
                    ...fetchMoreResult.source.Authentications,
                    edges: [...fetchMoreResult.source.Authentications.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            authentications,
            id,
            inspect: getOr(null, 'source.Authentications.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Authentications.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.Authentications.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getAuthenticationsSelector(state, type),
      isInspected,
    };
  };
  return mapStateToProps;
};

export const AuthenticationsQuery = connect(makeMapStateToProps)(AuthenticationsComponentQuery);
