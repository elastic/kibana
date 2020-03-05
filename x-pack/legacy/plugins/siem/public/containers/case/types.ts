/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface FormData {
  isNew?: boolean;
}

export interface NewCase extends FormData {
  description: string;
  tags: string[];
  title: string;
}

export interface NewComment extends FormData {
  comment: string;
}

export interface CommentSnake {
  comment_id: string;
  created_at: string;
  created_by: ElasticUserSnake;
  comment: string;
  updated_at: string;
  version: string;
}

export interface Comment {
  commentId: string;
  createdAt: string;
  createdBy: ElasticUser;
  comment: string;
  updatedAt: string;
  version: string;
}

export interface CaseSnake {
  case_id: string;
  comments: CommentSnake[];
  created_at: string;
  created_by: ElasticUserSnake;
  description: string;
  state: string;
  tags: string[];
  title: string;
  updated_at: string;
  version: string;
}

export interface Case {
  caseId: string;
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

export interface ElasticUserSnake {
  readonly username: string;
  readonly full_name?: string | null;
}

export interface ElasticUser {
  readonly username: string;
  readonly fullName?: string | null;
}

export interface FetchCasesProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}
