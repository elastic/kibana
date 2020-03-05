/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Comment {
  id: string;
  createdAt: string;
  createdBy: ElasticUser;
  comment: string;
  updatedAt: string;
  version: string;
}

export interface Case {
  id: string;
  comments: Comment[];
  createdAt: string;
  createdBy: ElasticUser;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updatedAt: string;
  version: string;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  search: string;
  state: string;
  tags: string[];
}

export interface AllCases {
  cases: Case[];
  page: number;
  perPage: number;
  total: number;
}

export enum SortFieldCase {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export interface ElasticUser {
  readonly username: string;
  readonly fullName?: string | null;
}

export interface FetchCasesProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}
