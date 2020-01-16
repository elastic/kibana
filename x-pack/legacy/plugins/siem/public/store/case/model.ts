/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortCase } from '../../graphql/types';

export enum CaseTableType {
  cases = 'cases',
}
export interface TableUpdates {
  activePage?: number;
  limit?: number;
  sort?: SortCase;
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface CasesQuery extends BasicQueryPaginated {
  sort: SortCase;
}

export interface CaseQueries {
  [CaseTableType.cases]: CasesQuery;
}

export interface CasePageModel {
  queries: CaseQueries;
}

export interface CaseModel {
  page: CasePageModel;
}
