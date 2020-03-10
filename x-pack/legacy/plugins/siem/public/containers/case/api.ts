/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CaseResponse,
  CasesResponse,
  CaseRequest,
  CommentRequest,
  CommentResponse,
} from '../../../../../../plugins/case/common/api';
import { KibanaServices } from '../../lib/kibana';
import { AllCases, Case, Comment, FetchCasesProps, SortFieldCase } from './types';
import { CASES_URL } from './constants';
import {
  convertToCamelCase,
  convertAllCasesToCamel,
  decodeCaseResponse,
  decodeCasesResponse,
  decodeCommentResponse,
} from './utils';

const CaseSavedObjectType = 'cases';

export const getCase = async (caseId: string, includeComments: boolean = true): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(`${CASES_URL}/${caseId}`, {
    method: 'GET',
    query: {
      includeComments,
    },
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const getTags = async (): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(`${CASES_URL}/tags`, {
    method: 'GET',
  });
  return response ?? [];
};

export const getCases = async ({
  filterOptions = {
    search: '',
    state: 'open',
    tags: [],
  },
  queryParams = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
}: FetchCasesProps): Promise<AllCases> => {
  const stateFilter = `${CaseSavedObjectType}.attributes.state: ${filterOptions.state}`;
  const tags = [
    ...(filterOptions.tags?.reduce(
      (acc, t) => [...acc, `${CaseSavedObjectType}.attributes.tags: ${t}`],
      [stateFilter]
    ) ?? [stateFilter]),
  ];
  const query = {
    ...queryParams,
    ...(tags.length > 0 ? { filter: tags.join(' AND ') } : {}),
    ...(filterOptions.search.length > 0 ? { search: filterOptions.search } : {}),
  };
  const response = await KibanaServices.get().http.fetch<CasesResponse>(`${CASES_URL}/_find`, {
    method: 'GET',
    query,
  });
  return convertAllCasesToCamel(decodeCasesResponse(response));
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
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updatedCase, id: caseId, version }),
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
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
  commentId: string,
  commentUpdate: string,
  version: string
): Promise<Partial<Comment>> => {
  const response = await KibanaServices.get().http.fetch<CommentResponse>(`${CASES_URL}/comments`, {
    method: 'PATCH',
    body: JSON.stringify({ comment: commentUpdate, id: commentId, version }),
  });
  return convertToCamelCase<CommentResponse, Comment>(decodeCommentResponse(response));
};

export const deleteCases = async (caseIds: string[]): Promise<boolean> => {
  const response = await KibanaServices.get().http.fetch<string>(`${CASES_URL}`, {
    method: 'DELETE',
    query: { ids: JSON.stringify(caseIds) },
  });
  return response === 'true' ? true : false;
};
