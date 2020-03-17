/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CaseResponse,
  CasesResponse,
  CasesFindResponse,
  CaseRequest,
  CasesStatusResponse,
  CommentRequest,
  CommentResponse,
  User,
} from '../../../../../../plugins/case/common/api';
import { KibanaServices } from '../../lib/kibana';
import {
  AllCases,
  BulkUpdateStatus,
  Case,
  CasesStatus,
  Comment,
  FetchCasesProps,
  SortFieldCase,
} from './types';
import { CASES_URL } from './constants';
import {
  convertToCamelCase,
  convertAllCasesToCamel,
  decodeCaseResponse,
  decodeCasesResponse,
  decodeCasesFindResponse,
  decodeCasesStatusResponse,
  decodeCommentResponse,
} from './utils';

export const getCase = async (caseId: string, includeComments: boolean = true): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(`${CASES_URL}/${caseId}`, {
    method: 'GET',
    query: {
      includeComments,
    },
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const getCasesStatus = async (signal: AbortSignal): Promise<CasesStatus> => {
  const response = await KibanaServices.get().http.fetch<CasesStatusResponse>(
    `${CASES_URL}/status`,
    {
      method: 'GET',
      signal,
    }
  );
  return convertToCamelCase<CasesStatusResponse, CasesStatus>(decodeCasesStatusResponse(response));
};

export const getTags = async (): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(`${CASES_URL}/tags`, {
    method: 'GET',
  });
  return response ?? [];
};

export const getReporters = async (signal: AbortSignal): Promise<User[]> => {
  const response = await KibanaServices.get().http.fetch<User[]>(`${CASES_URL}/reporters`, {
    method: 'GET',
    signal,
  });
  return response ?? [];
};

export const getCases = async ({
  filterOptions = {
    search: '',
    reporters: [],
    status: 'open',
    tags: [],
  },
  queryParams = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
}: FetchCasesProps): Promise<AllCases> => {
  const query = {
    reporters: filterOptions.reporters.map(r => r.username),
    tags: filterOptions.tags,
    ...(filterOptions.status !== '' ? { status: filterOptions.status } : {}),
    ...(filterOptions.search.length > 0 ? { search: filterOptions.search } : {}),
    ...queryParams,
  };
  const response = await KibanaServices.get().http.fetch<CasesFindResponse>(`${CASES_URL}/_find`, {
    method: 'GET',
    query,
  });
  return convertAllCasesToCamel(decodeCasesFindResponse(response));
};

export const postCase = async (newCase: CaseRequest): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(`${CASES_URL}`, {
    method: 'POST',
    body: JSON.stringify(newCase),
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const patchCase = async (
  caseId: string,
  updatedCase: Partial<CaseRequest>,
  version: string
): Promise<Case[]> => {
  const response = await KibanaServices.get().http.fetch<CasesResponse>(`${CASES_URL}`, {
    method: 'PATCH',
    body: JSON.stringify({ cases: [{ ...updatedCase, id: caseId, version }] }),
  });
  return convertToCamelCase<CasesResponse, Case[]>(decodeCasesResponse(response));
};

export const patchCasesStatus = async (cases: BulkUpdateStatus[]): Promise<Case[]> => {
  const response = await KibanaServices.get().http.fetch<CasesResponse>(`${CASES_URL}`, {
    method: 'PATCH',
    body: JSON.stringify({ cases }),
  });
  return convertToCamelCase<CasesResponse, Case[]>(decodeCasesResponse(response));
};

export const postComment = async (newComment: CommentRequest, caseId: string): Promise<Comment> => {
  const response = await KibanaServices.get().http.fetch<CommentResponse>(
    `${CASES_URL}/${caseId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(newComment),
    }
  );
  return convertToCamelCase<CommentResponse, Comment>(decodeCommentResponse(response));
};

export const patchComment = async (
  caseId: string,
  commentId: string,
  commentUpdate: string,
  version: string
): Promise<Partial<Comment>> => {
  const response = await KibanaServices.get().http.fetch<CommentResponse>(
    `${CASES_URL}/${caseId}/comments`,
    {
      method: 'PATCH',
      body: JSON.stringify({ comment: commentUpdate, id: commentId, version }),
    }
  );
  return convertToCamelCase<CommentResponse, Comment>(decodeCommentResponse(response));
};

export const deleteCases = async (caseIds: string[]): Promise<boolean> => {
  const response = await KibanaServices.get().http.fetch<string>(`${CASES_URL}`, {
    method: 'DELETE',
    query: { ids: JSON.stringify(caseIds) },
  });
  return response === 'true' ? true : false;
};
