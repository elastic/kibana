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
  DomainsEdges,
  DomainsSortField,
  GetDomainsQuery,
  FlowDirection,
  FlowTarget,
  PageInfoPaginated,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { generateTablePaginationOptions } from '../../components/paginated_table/helpers';
import { QueryTemplatePaginated, QueryTemplatePaginatedProps } from '../query_template_paginated';
import { domainsQuery } from './index.gql_query';

const ID = 'domainsQuery';

export interface DomainsArgs {
  domains: DomainsEdges[];
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: DomainsArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface DomainsComponentReduxProps {
  activePage: number;
  domainsSortField: DomainsSortField;
  flowDirection: FlowDirection;
  isInspected: boolean;
  limit: number;
}

type DomainsProps = OwnProps & DomainsComponentReduxProps;

class DomainsComponentQuery extends QueryTemplatePaginated<
  DomainsProps,
  GetDomainsQuery.Query,
  GetDomainsQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      domainsSortField,
      endDate,
      filterQuery,
      flowDirection,
      flowTarget,
      id = ID,
      ip,
      isInspected,
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    const variables: GetDomainsQuery.Variables = {
      defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      flowDirection,
      flowTarget,
      inspect: isInspected,
      ip,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort: domainsSortField,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };
    return (
      <Query<GetDomainsQuery.Query, GetDomainsQuery.Variables>
        query={domainsQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          filterQuery: createFilter(filterQuery),
          flowDirection,
          flowTarget,
          inspect: isInspected,
          ip,
          pagination: generateTablePaginationOptions(activePage, limit),
          sort: domainsSortField,
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
        }}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const domains = getOr([], `source.Domains.edges`, data);
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
                  Domains: {
                    ...fetchMoreResult.source.Domains,
                    edges: [...fetchMoreResult.source.Domains.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            domains,
            id,
            inspect: getOr(null, 'source.Domains.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Domains.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.Domains.totalCount', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getDomainsSelector = networkSelectors.domainsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getDomainsSelector(state),
      isInspected,
    };
  };

  return mapStateToProps;
};

export const DomainsQuery = connect(makeMapStateToProps)(DomainsComponentQuery);
