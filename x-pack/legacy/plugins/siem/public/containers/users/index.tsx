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
  GetUsersQuery,
  FlowTarget,
  PageInfo,
  UsersEdges,
  UsersSortField,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State, inputsSelectors } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { usersQuery } from './index.gql_query';

const ID = 'usersQuery';

export interface UsersArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  users: UsersEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: UsersArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface UsersComponentReduxProps {
  isInspected: boolean;
  limit: number;
  usersSortField: UsersSortField;
}

type UsersProps = OwnProps & UsersComponentReduxProps;

class UsersComponentQuery extends QueryTemplate<
  UsersProps,
  GetUsersQuery.Query,
  GetUsersQuery.Variables
> {
  public render() {
    const {
      id = ID,
      isInspected,
      children,
      usersSortField,
      filterQuery,
      ip,
      skip,
      sourceId,
      startDate,
      endDate,
      limit,
      flowTarget,
    } = this.props;
    return (
      <Query<GetUsersQuery.Query, GetUsersQuery.Variables>
        query={usersQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          ip,
          flowTarget,
          sort: usersSortField,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const users = getOr([], `source.Users.edges`, data);
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
                  Users: {
                    ...fetchMoreResult.source.Users,
                    edges: [...prev.source.Users.edges, ...fetchMoreResult.source.Users.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            inspect: getOr(null, 'source.Users.inspect', data),
            refetch,
            loading,
            totalCount: getOr(0, 'source.Users.totalCount', data),
            users,
            pageInfo: getOr({}, 'source.Users.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getUsersSelector(state),
      isInspected,
    };
  };

  return mapStateToProps;
};

export const UsersQuery = connect(makeMapStateToProps)(UsersComponentQuery);
