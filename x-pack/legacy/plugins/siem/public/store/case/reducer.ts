/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { CaseModel, CaseTableType } from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../constants';
import { Direction, SortFieldCase } from '../../graphql/types';
import { updateCaseTable } from './actions';

export type CaseState = CaseModel;

export const initialCaseState: CaseState = {
  page: {
    queries: {
      [CaseTableType.cases]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: SortFieldCase.created_at,
          direction: Direction.desc,
        },
      },
    },
  },
};

export const caseReducer = reducerWithInitialState(initialCaseState)
  .case(updateCaseTable, (state, { tableType, updates }) => ({
    ...state,
    page: {
      ...state.page,
      queries: {
        ...state.page.queries,
        [tableType]: {
          ...state.page.queries[tableType],
          ...updates,
        },
      },
    },
  }))
  .build();
