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
  case_type: string;
}

export interface NewCaseFormatted extends NewCase {
  state: string;
  updated_at: number;
}

export interface UpdateCase {
  case_type?: string;
  description?: string;
  state?: string;
  tags?: string[];
  title?: string;
  updated_at?: number;
}

interface Case {
  case_type: string;
  created_at: number;
  created_by: ElasticUser;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updated_at: number;
}

export interface UpdateCaseSavedObject {
  attributes: UpdateCase;
  id: string;
  type: string;
  updated_at: string;
  version: string;
}

export interface CaseSavedObject {
  attributes: CaseResult;
  id: string;
  type: string;
  updated_at: string;
  version: string;
}

export interface CaseResult {
  case_type: string;
  created_at: number;
  created_by: ElasticUser;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updated_at: number;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: Direction;
}

export interface QueryArgs {
  page?: number;
  perPage?: number;
  sortField?: SortFieldCase;
  sortOrder?: Direction;
}

export interface UseGetCasesState {
  data: FlattenedCasesSavedObjects;
  isLoading: boolean;
  isError: boolean;
  queryParams: QueryParams;
  filterOptions: FilterOptions;
}
export interface Action {
  type: string;
  payload?: FlattenedCasesSavedObjects | QueryArgs | FilterOptions;
}

export interface FilterOptions {
  search: string;
  tags: string[];
}

export interface FlattenedCaseSavedObject extends CaseResult {
  id: string;
  type: string;
  version: string;
}
export interface FlattenedCasesSavedObjects {
  saved_objects: FlattenedCaseSavedObject[] | [];
  page: number;
  per_page: number;
  total: number;
}
export enum SortFieldCase {
  createdAt = 'created_at',
  state = 'state',
  updatedAt = 'updated_at',
}

export interface ElasticUser {
  username: string;
  full_name?: string;
}

export interface FetchCasesProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}

export interface FetchCasesResponse {
  page: number;
  perPage: number;
  total: number;
  saved_objects: CaseSavedObject[];
  data: Case[];
}
