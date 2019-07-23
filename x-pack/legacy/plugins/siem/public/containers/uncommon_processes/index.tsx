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
  GetUncommonProcessesQuery,
  PageInfoPaginated,
  UncommonProcessesEdges,
} from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

import { uncommonProcessesQuery } from './index.gql_query';

const ID = 'uncommonProcessesQuery';

export interface UncommonProcessesArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
  uncommonProcesses: UncommonProcessesEdges[];
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: UncommonProcessesArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface UncommonProcessesComponentReduxProps {
  activePage: number;
  isInspected: boolean;
  limit: number;
}

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps;

class UncommonProcessesComponentQuery extends QueryTemplatePaginated<
  UncommonProcessesProps,
  GetUncommonProcessesQuery.Query,
  GetUncommonProcessesQuery.Variables
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
    return (
      <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
        query={uncommonProcessesQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          filterQuery: createFilter(filterQuery),
          inspect: isInspected,
          pagination: generateTablePaginationOptions(activePage, limit),
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const uncommonProcesses = getOr([], 'source.UncommonProcesses.edges', data);
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
                  UncommonProcesses: {
                    ...fetchMoreResult.source.UncommonProcesses,
                    edges: [...fetchMoreResult.source.UncommonProcesses.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            inspect: getOr(null, 'source.UncommonProcesses.inspect', data),
            loading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
            refetch,
            totalCount: getOr(0, 'source.UncommonProcesses.totalCount', data),
            uncommonProcesses,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getUncommonProcessesSelector(state, type),
      isInspected,
    };
  };
  return mapStateToProps;
};

export const UncommonProcessesQuery = connect(makeMapStateToProps)(UncommonProcessesComponentQuery);
