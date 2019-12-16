/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import chrome from 'ui/chrome';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  FlowTargetSourceDest,
  GetNetworkTopNFlowQuery,
  GetNetworkTopNFlowQueryComponent,
  NetworkTopNFlowEdges,
  NetworkTopTablesSortField,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, networkModel, networkSelectors, State } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

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
  children: (args: NetworkTopNFlowArgs) => React.ReactElement;
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
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      sort,
    } = this.props;
    const variables: GetNetworkTopNFlowQuery.Variables = {
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
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
      <GetNetworkTopNFlowQueryComponent
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
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
      </GetNetworkTopNFlowQueryComponent>
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
  connect(makeMapStateToProps)
)(NetworkTopNFlowComponentQuery);
