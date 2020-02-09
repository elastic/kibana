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
  GetUncommonProcessesQuery,
  PageInfoPaginated,
  UncommonProcessesEdges,
} from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State, inputsSelectors } from '../../store';
import { withKibana, WithKibanaProps } from '../../lib/kibana';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';

import { uncommonProcessesQuery } from './index.gql_query';

const ID = 'uncommonProcessesQuery';

export interface UncommonProcessesArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
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

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps & WithKibanaProps;

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
      kibana,
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    const variables: GetUncommonProcessesQuery.Variables = {
      defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      inspect: isInspected,
      pagination: generateTablePaginationOptions(activePage, limit),
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };
    return (
      <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
        query={uncommonProcessesQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
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
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.UncommonProcesses.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.UncommonProcesses.totalCount', data),
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

export const UncommonProcessesQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(UncommonProcessesComponentQuery);
