/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes } from 'kibana/server';
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

export interface UpdateCase {
  case_type?: string;
  description?: string;
  state?: string;
  tags?: string[];
  title?: string;
  updated_at?: number;
}

export interface CaseAttributes extends SavedObjectAttributes {
  case_type: string;
  created_at: number;
  // typescript STEPH FIX
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

export interface FilterOptions {
  search: string;
  tags: string[];
}

export type FlattenedCaseSavedObject = Omit<
  SavedObject<CaseAttributes>,
  'updated_at' | 'attributes'
> &
  CaseAttributes;

export interface AllCases {
  cases: FlattenedCaseSavedObject[];
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
