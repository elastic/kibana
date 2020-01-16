/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { GetCasesQuery, CasesSavedObjects, Direction, SortFieldCase } from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplateProps } from '../../query_template';

import { casesQuery } from './index.gql_query';

const ID = 'casesQuery';

export interface CasesArgs {
  id: string;
  cases: CasesSavedObjects;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface CasesProps extends QueryTemplateProps {
  children: (args: CasesArgs) => React.ReactNode;
  search?: string;
}

const CasesComponentQuery = React.memo<CasesProps>(({ id = ID, children, skip, search }) => (
  <Query<GetCasesQuery.Query, GetCasesQuery.Variables>
    query={casesQuery}
    fetchPolicy={getDefaultFetchPolicy()}
    notifyOnNetworkStatusChange
    skip={skip}
    variables={{
      pageInfo: {
        pageIndex: 1,
        pageSize: 5,
      },
      search,
      sort: {
        sortField: SortFieldCase.created_at,
        sortOrder: Direction.asc,
      },
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
        refetch,
      });
    }}
  </Query>
));

CasesComponentQuery.displayName = 'CasesComponentQuery';

export const CasesQuery = CasesComponentQuery;
