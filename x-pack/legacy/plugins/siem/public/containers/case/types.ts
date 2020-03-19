/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../../../../../../plugins/case/common/api';

export interface Comment {
  id: string;
  createdAt: string;
  createdBy: ElasticUser;
  comment: string;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
  version: string;
}

export interface Case {
  id: string;
  closedAt: string | null;
  closedBy: ElasticUser | null;
  comments: Comment[];
  commentIds: string[];
  createdAt: string;
  createdBy: ElasticUser;
  description: string;
  status: string;
  tags: string[];
  title: string;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
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
  status: string;
  tags: string[];
  reporters: User[];
}

export interface CasesStatus {
  countClosedCases: number | null;
  countOpenCases: number | null;
}

export interface AllCases extends CasesStatus {
  cases: Case[];
  page: number;
  perPage: number;
  total: number;
}

export enum SortFieldCase {
  createdAt = 'createdAt',
  closedAt = 'closedAt',
}

export interface ElasticUser {
  readonly email?: string | null;
  readonly fullName?: string | null;
  readonly username: string;
}

export interface FetchCasesProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}

export interface ApiProps {
  signal: AbortSignal;
}
