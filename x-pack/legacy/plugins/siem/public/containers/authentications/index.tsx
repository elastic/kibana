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
import { AuthenticationsEdges, GetAuthenticationsQuery, PageInfo } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

import { authenticationsQuery } from './index.gql_query';

export interface AuthenticationArgs {
  id: string;
  authentications: AuthenticationsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: AuthenticationArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface AuthenticationsComponentReduxProps {
  activePage: number;
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
      id = 'authenticationQuery',
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    return (
      <Query<GetAuthenticationsQuery.Query, GetAuthenticationsQuery.Variables>
        query={authenticationsQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          pagination: generateTablePaginationOptions(activePage, limit),
          filterQuery: createFilter(filterQuery),
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
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
          return children({
            authentications,
            id,
            loading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Authentications.pageInfo', data),
            refetch,
            totalCount: getOr(0, 'source.Authentications.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getAuthenticationsSelector(state, type);
  };
  return mapStateToProps;
};

export const AuthenticationsQuery = connect(makeMapStateToProps)(AuthenticationsComponentQuery);
