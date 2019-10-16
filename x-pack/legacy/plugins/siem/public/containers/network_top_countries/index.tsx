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
  FlowTargetSourceDest,
  GetNetworkTopCountriesQuery,
  NetworkTopCountriesEdges,
  NetworkTopTablesSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, networkModel, networkSelectors, State } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { networkTopCountriesQuery } from './index.gql_query';

const ID = 'networkTopCountriesQuery';

export interface NetworkTopCountriesArgs {
  id: string;
  ip?: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkTopCountries: NetworkTopCountriesEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkTopCountriesArgs) => React.ReactNode;
  flowTarget: FlowTargetSourceDest;
  ip?: string;
  type: networkModel.NetworkType;
}

export interface NetworkTopCountriesComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  topCountriesSort: NetworkTopTablesSortField;
}

type NetworkTopCountriesProps = OwnProps & NetworkTopCountriesComponentReduxProps;

class NetworkTopCountriesComponentQuery extends QueryTemplatePaginated<
  NetworkTopCountriesProps,
  GetNetworkTopCountriesQuery.Query,
  GetNetworkTopCountriesQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      flowTarget,
      filterQuery,
      id = `${ID}-${flowTarget}`,
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      topCountriesSort,
    } = this.props;
    const variables: GetNetworkTopCountriesQuery.Variables = {
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      flowTarget,
      inspect: isInspected,
      ip,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort: topCountriesSort,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };
    return (
      <Query<GetNetworkTopCountriesQuery.Query, GetNetworkTopCountriesQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={networkTopCountriesQuery}
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const networkTopCountries = getOr([], `source.NetworkTopCountries.edges`, data);
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
                  NetworkTopCountries: {
                    ...fetchMoreResult.source.NetworkTopCountries,
                    edges: [...fetchMoreResult.source.NetworkTopCountries.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.NetworkTopCountries.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            networkTopCountries,
            pageInfo: getOr({}, 'source.NetworkTopCountries.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.NetworkTopCountries.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const mapStateToProps = (
  state: State,
  { flowTarget, id = `${ID}-${flowTarget}`, type }: OwnProps
) => {
  const getNetworkTopCountriesSelector = networkSelectors.topCountriesSelector(flowTarget, type);
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const { isInspected } = getQuery(state, id);
  return {
    ...getNetworkTopCountriesSelector(state),
    isInspected,
  };
};

export const NetworkTopCountriesQuery = connect(mapStateToProps)(NetworkTopCountriesComponentQuery);
