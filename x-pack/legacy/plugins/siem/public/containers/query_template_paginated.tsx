/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloQueryResult } from 'apollo-client';
import React from 'react';
import { FetchMoreOptions, FetchMoreQueryOptions, OperationVariables } from 'react-apollo';

import { ESQuery } from '../../common/typed_json';

export interface QueryTemplatePaginatedProps {
  id?: string;
  endDate?: number;
  filterQuery?: ESQuery | string;
  skip?: boolean;
  sourceId: string;
  startDate?: number;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchMoreOptionsArgs<TData, TVariables> = FetchMoreQueryOptions<any, any> &
  FetchMoreOptions<TData, TVariables>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromiseApolloQueryResult = Promise<ApolloQueryResult<any>>;

export class QueryTemplatePaginated<
  T extends QueryTemplatePaginatedProps,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables = OperationVariables
> extends React.PureComponent<T, TData, TVariables> {
  private fetchMore!: (
    fetchMoreOptions: FetchMoreOptionsArgs<TData, TVariables>
  ) => PromiseApolloQueryResult;

  private fetchMoreOptions!: (newActivePage: number) => FetchMoreOptionsArgs<TData, TVariables>;

  public constructor(props: T) {
    super(props);
  }

  public setFetchMore = (
    val: (fetchMoreOptions: FetchMoreOptionsArgs<TData, TVariables>) => PromiseApolloQueryResult
  ) => {
    this.fetchMore = val;
  };

  public setFetchMoreOptions = (
    val: (newActivePage: number) => FetchMoreOptionsArgs<TData, TVariables>
  ) => {
    this.fetchMoreOptions = val;
  };

  public wrappedLoadMore = (newActivePage: number) => {
    return this.fetchMore(this.fetchMoreOptions(newActivePage));
  };
}
