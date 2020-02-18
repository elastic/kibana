/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '../../graphql/types';
interface FormData {
  isNew?: boolean;
}

export interface NewCase extends FormData {
  description: string;
  tags: string[];
  title: string;
}

export interface CaseSnake {
  case_id: string;
  created_at: string;
  created_by: ElasticUser;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updated_at: string;
}

export interface Case {
  caseId: string;
  createdAt: string;
  createdBy: ElasticUser;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updatedAt: string;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: Direction;
}

export interface FilterOptions {
  search: string;
  tags: string[];
}

export interface AllCasesSnake {
  cases: CaseSnake[];
  page: number;
  per_page: number;
  total: number;
}

export interface AllCases {
  cases: Case[];
  page: number;
  perPage: number;
  total: number;
}
export enum SortFieldCase {
  createdAt = 'createdAt',
  state = 'state',
  updatedAt = 'updatedAt',
}

export interface ElasticUser {
  readonly username: string;
  readonly full_name?: string;
}

export interface FetchCasesProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}
