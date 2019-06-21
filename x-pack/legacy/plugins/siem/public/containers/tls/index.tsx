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
import { FlowTarget, PageInfo, TlsEdges, TlsSortField, GetTlsQuery } from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { tlsQuery } from './index.gql_query';

export interface TlsArgs {
  id: string;
  tls: TlsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: TlsArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface TlsComponentReduxProps {
  limit: number;
  tlsSortField: TlsSortField;
}

type TlsProps = OwnProps & TlsComponentReduxProps;

class TlsComponentQuery extends QueryTemplate<TlsProps, GetTlsQuery.Query, GetTlsQuery.Variables> {
  public render() {
    const {
      id = 'tlsQuery',
      children,
      tlsSortField,
      filterQuery,
      ip,
      sourceId,
      startDate,
      endDate,
      limit,
      flowTarget,
    } = this.props;
    return (
      <Query<GetTlsQuery.Query, GetTlsQuery.Variables>
        query={tlsQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate ? startDate : 0,
            to: endDate ? endDate : Date.now(),
          },
          ip,
          flowTarget,
          sort: tlsSortField,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const tls = getOr([], 'source.Tls.edges', data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                limit: limit + parseInt(newCursor, 10),
              },
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
                    edges: [...prev.source.Tls.edges, ...fetchMoreResult.source.Tls.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            refetch,
            loading,
            totalCount: getOr(0, 'source.Tls.totalCount', data),
            tls,
            pageInfo: getOr({}, 'source.Tls.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  const mapStateToProps = (state: State) => ({
    ...getTlsSelector(state),
  });

  return mapStateToProps;
};

export const TlsQuery = connect(makeMapStateToProps)(TlsComponentQuery);
