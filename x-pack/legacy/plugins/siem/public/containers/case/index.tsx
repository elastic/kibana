/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { GetCaseQuery, CaseSavedObject } from '../../graphql/types';
import { inputsModel } from '../../store';
import { getDefaultFetchPolicy } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { caseQuery } from './index.gql_query';

const ID = 'caseQuery';

export interface CaseArgs {
  id: string;
  caseData: CaseSavedObject;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface CaseProps extends QueryTemplateProps {
  caseId: string;
  children: (args: CaseArgs) => React.ReactNode;
}

const CaseComponentQuery = React.memo<CaseProps>(
  ({ id = ID, children, skip, sourceId, caseId }) => (
    <Query<GetCaseQuery.Query, GetCaseQuery.Variables>
      query={caseQuery}
      fetchPolicy={getDefaultFetchPolicy()}
      notifyOnNetworkStatusChange
      skip={skip}
      variables={{
        caseId,
      }}
    >
      {({ data, loading, refetch }) => {
        const init: CaseSavedObject = {
          id: caseId,
          type: '',
          updated_at: '',
          version: '',
          attributes: {
            assignees: [],
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
        };
        const caseData: CaseSavedObject = getOr(init, 'getCase', data);
        return children({
          id,
          caseData,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);

CaseComponentQuery.displayName = 'CaseComponentQuery';

export const CaseQuery = CaseComponentQuery;
