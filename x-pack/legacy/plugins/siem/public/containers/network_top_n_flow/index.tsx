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

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  FlowTargetSourceDest,
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowEdges,
  NetworkTopTablesSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { withKibana, WithKibanaProps } from '../../lib/kibana';
import { inputsModel, inputsSelectors, networkModel, networkSelectors, State } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { networkTopNFlowQuery } from './index.gql_query';

const ID = 'networkTopNFlowQuery';

export interface NetworkTopNFlowArgs {
  id: string;
  ip?: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkTopNFlow: NetworkTopNFlowEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkTopNFlowArgs) => React.ReactNode;
  flowTarget: FlowTargetSourceDest;
  ip?: string;
  type: networkModel.NetworkType;
}

export interface NetworkTopNFlowComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  sort: NetworkTopTablesSortField;
}

type NetworkTopNFlowProps = OwnProps & NetworkTopNFlowComponentReduxProps & WithKibanaProps;

class NetworkTopNFlowComponentQuery extends QueryTemplatePaginated<
  NetworkTopNFlowProps,
  GetNetworkTopNFlowQuery.Query,
  GetNetworkTopNFlowQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      flowTarget,
      filterQuery,
      kibana,
      id = `${ID}-${flowTarget}`,
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      sort,
    } = this.props;
    const variables: GetNetworkTopNFlowQuery.Variables = {
      defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      flowTarget,
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
      <Query<GetNetworkTopNFlowQuery.Query, GetNetworkTopNFlowQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={networkTopNFlowQuery}
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const networkTopNFlow = getOr([], `source.NetworkTopNFlow.edges`, data);
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
                  NetworkTopNFlow: {
                    ...fetchMoreResult.source.NetworkTopNFlow,
                    edges: [...fetchMoreResult.source.NetworkTopNFlow.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.NetworkTopNFlow.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            networkTopNFlow,
            pageInfo: getOr({}, 'source.NetworkTopNFlow.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.NetworkTopNFlow.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getTopNFlowSelector = networkSelectors.topNFlowSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  return (state: State, { flowTarget, id = `${ID}-${flowTarget}`, type }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getTopNFlowSelector(state, type, flowTarget),
      isInspected,
    };
  };
};

export const NetworkTopNFlowQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(NetworkTopNFlowComponentQuery);
