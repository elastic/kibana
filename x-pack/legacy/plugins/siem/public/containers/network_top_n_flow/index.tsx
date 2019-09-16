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
  FlowTargetNew,
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowEdges,
  NetworkTopNFlowSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, networkModel, networkSelectors, State } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { networkTopNFlowQuery } from './index.gql_query';

const ID = 'networkTopNFlowQuery';

export interface NetworkTopNFlowArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkTopNFlow: NetworkTopNFlowEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkTopNFlowArgs) => React.ReactNode;
  flowTarget: FlowTargetNew;
  type: networkModel.NetworkType;
}

export interface NetworkTopNFlowComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  topNFlowSort: NetworkTopNFlowSortField;
}

type NetworkTopNFlowProps = OwnProps & NetworkTopNFlowComponentReduxProps;

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
      id = `${ID}-${flowTarget}`,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      topNFlowSort,
    } = this.props;
    return (
      <Query<GetNetworkTopNFlowQuery.Query, GetNetworkTopNFlowQuery.Variables>
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        query={networkTopNFlowQuery}
        skip={skip}
        variables={{
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          filterQuery: createFilter(filterQuery),
          flowTarget,
          inspect: isInspected,
          pagination: generateTablePaginationOptions(activePage, limit),
          sort: topNFlowSort,
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
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
          return children({
            id,
            inspect: getOr(null, 'source.NetworkTopNFlow.inspect', data),
            loading,
            loadPage: this.wrappedLoadMore,
            networkTopNFlow,
            pageInfo: getOr({}, 'source.NetworkTopNFlow.pageInfo', data),
            refetch,
            totalCount: getOr(-1, 'source.NetworkTopNFlow.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const mapStateToProps = (state: State, { flowTarget, id = `${ID}-${flowTarget}` }: OwnProps) => {
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector(flowTarget);
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const { isInspected } = getQuery(state, id);
  return {
    ...getNetworkTopNFlowSelector(state),
    isInspected,
  };
};

export const NetworkTopNFlowQuery = connect(mapStateToProps)(NetworkTopNFlowComponentQuery);
