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
  FlowTarget,
  PageInfoPaginated,
  TlsEdges,
  TlsSortField,
  GetTlsQuery,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { createFilter } from '../helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { tlsQuery } from './index.gql_query';

const ID = 'tlsQuery';

export interface TlsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  tls: TlsEdges[];
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: TlsArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface TlsComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
  tlsSortField: TlsSortField;
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
      tlsSortField,
    } = this.props;
    return (
      <Query<GetTlsQuery.Query, GetTlsQuery.Variables>
        query={tlsQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          filterQuery: createFilter(filterQuery),
          flowTarget,
          inspect: isInspected,
          ip,
          pagination: generateTablePaginationOptions(activePage, limit),
          sort: tlsSortField,
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate ? startDate : 0,
            to: endDate ? endDate : Date.now(),
          },
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
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
          return children({
            id,
            inspect: getOr(null, 'source.Tls.inspect', data),
            loading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Tls.pageInfo', data),
            refetch,
            tls,
            totalCount: getOr(-1, 'source.Tls.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getTlsSelector(state),
      isInspected,
    };
  };

  return mapStateToProps;
};

export const TlsQuery = connect(makeMapStateToProps)(TlsComponentQuery);
