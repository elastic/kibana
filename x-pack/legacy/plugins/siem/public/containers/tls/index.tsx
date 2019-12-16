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
  PageInfoPaginated,
  TlsEdges,
  TlsSortField,
  GetTlsQuery,
  GetTlsQueryComponent,
  FlowTargetSourceDest,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

const ID = 'tlsQuery';

export interface TlsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  tls: TlsEdges[];
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: TlsArgs) => React.ReactElement;
  flowTarget: FlowTargetSourceDest;
  ip: string;
  type: networkModel.NetworkType;
}

export interface TlsComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  sort: TlsSortField;
}

type TlsProps = OwnProps & TlsComponentReduxProps;

class TlsComponentQuery extends QueryTemplatePaginated<
  TlsProps,
  GetTlsQuery.Query,
  GetTlsQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      flowTarget,
      id = ID,
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
      sort,
    } = this.props;
    const variables: GetTlsQuery.Variables = {
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
        from: startDate ? startDate : 0,
        to: endDate ? endDate : Date.now(),
      },
    };
    return (
      <GetTlsQueryComponent
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const tls = getOr([], 'source.Tls.edges', data);
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
                  Tls: {
                    ...fetchMoreResult.source.Tls,
                    edges: [...fetchMoreResult.source.Tls.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.Tls.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Tls.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            tls,
            totalCount: getOr(-1, 'source.Tls.totalCount', data),
          });
        }}
      </GetTlsQueryComponent>
    );
  }
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  return (state: State, { flowTarget, id = ID, type }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getTlsSelector(state, type, flowTarget),
      isInspected,
    };
  };
};

export const TlsQuery = compose<React.ComponentClass<OwnProps>>(connect(makeMapStateToProps))(
  TlsComponentQuery
);
