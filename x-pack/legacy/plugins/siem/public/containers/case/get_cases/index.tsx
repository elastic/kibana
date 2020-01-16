/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { connect } from 'react-redux';
import { compose } from 'redux';
import React from 'react';
import { Query } from 'react-apollo';
import {
  GetCasesQuery,
  CasesSavedObjects,
  SortCase,
} from '../../../graphql/types';
import { inputsModel, State } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplateProps } from '../../query_template';

import { casesQuery } from './index.gql_query';
import { caseSelectors } from '../../../store/case';
import { QueryTemplatePaginated } from '../../query_template_paginated';

const ID = 'casesQuery';

export interface CasesArgs {
  id: string;
  cases: CasesSavedObjects;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: CasesArgs) => React.ReactNode;
  search?: string;
}

export interface CasesQueryReduxProps {
  activePage: number;
  limit: number;
  sort: SortCase;
}

type CasesComponentQueryProps = OwnProps & CasesQueryReduxProps;

class CasesComponentQuery extends QueryTemplatePaginated<
  CasesComponentQueryProps,
  GetCasesQuery.Query,
  GetCasesQuery.Variables
> {
  public render() {
    const { activePage, children, limit, search, skip, sort } = this.props;
    console.log('Did we update?!?1', this.props);
    return (
      <Query<GetCasesQuery.Query, GetCasesQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={casesQuery}
        skip={skip}
        variables={{
          pageInfo: {
            pageIndex: activePage,
            pageSize: limit,
          },
          search,
          sort,
        }}
      >
        {({ data, loading, refetch }) => {
          const init: CasesSavedObjects = {
            page: 0,
            per_page: 0,
            total: 0,
            saved_objects: [
              {
                id: '000',
                type: '',
                updated_at: '',
                version: '',
                attributes: {
                  case_type: '',
                  created_at: 1234235345,
                  created_by: {
                    username: '',
                    full_name: null,
                  },
                  description: '',
                  state: 'open',
                  tags: [],
                  title: '',
                },
              },
            ],
          };
          const caseData: CasesSavedObjects = getOr(init, 'getCases', data);
          return children({
            id: ID,
            cases: caseData,
            loading,
            loadPage: this.wrappedLoadMore,
            refetch,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getCasesSelector = caseSelectors.casesSelector();
  return (state: State) => getCasesSelector(state);
};
export const CasesQuery = compose<React.ComponentClass<OwnProps>>(connect(makeMapStateToProps))(
  CasesComponentQuery
);
