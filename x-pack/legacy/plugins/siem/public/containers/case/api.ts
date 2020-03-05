/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../lib/kibana';
import {
  AllCases,
  Case,
  CaseSnake,
  Comment,
  CommentSnake,
  FetchCasesProps,
  NewCase,
  NewComment,
  SortFieldCase,
} from './types';
import { CASES_URL } from './constants';
import { convertToCamelCase, convertAllCasesToCamel } from './utils';

export const getCase = async (caseId: string, includeComments: boolean = true): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/${caseId}`, {
    method: 'GET',
    query: {
      includeComments,
    },
  });
  return convertToCamelCase<CaseSnake, Case>(response);
};

export const getCases = async ({
  filterOptions = {
    search: '',
    tags: [],
  },
  queryParams = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
}: FetchCasesProps): Promise<AllCases> => {
  const tags = [...(filterOptions.tags?.map(t => `case-workflow.attributes.tags: ${t}`) ?? [])];
  const query = {
    ...queryParams,
    filter: tags.join(' AND '),
    search: filterOptions.search,
  };
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}`, {
    method: 'GET',
    query,
  });
  return convertAllCasesToCamel(response);
};

export const createCase = async (newCase: NewCase): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}`, {
    method: 'POST',
    body: JSON.stringify(newCase),
  });
  return convertToCamelCase<CaseSnake, Case>(response);
};

export const updateCaseProperty = async (
  caseId: string,
  updatedCase: Partial<Case>,
  version: string
): Promise<Partial<Case>> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/${caseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ case: updatedCase, version }),
  });
  return convertToCamelCase<Partial<CaseSnake>, Partial<Case>>(response);
};

export const createComment = async (newComment: NewComment, caseId: string): Promise<Comment> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/${caseId}/comment`, {
    method: 'POST',
    body: JSON.stringify(newComment),
  });
  return convertToCamelCase<CommentSnake, Comment>(response);
};

export const updateComment = async (
  commentId: string,
  commentUpdate: string,
  version: string
): Promise<Partial<Comment>> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/comment/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ comment: commentUpdate, version }),
  });
  return convertToCamelCase<Partial<CommentSnake>, Partial<Comment>>(response);
};
