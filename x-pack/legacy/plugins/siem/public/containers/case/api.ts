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
import { throwIfNotOk } from '../../hooks/api/api';
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
    asResponse: true,
    query: {
      includeComments,
    },
  });
  await throwIfNotOk(response.response);
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response.body));
};

export const getTags = async (): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(`${CASES_URL}/tags`, {
    method: 'GET',
    asResponse: true,
  });
  await throwIfNotOk(response.response);
  return response.body ?? [];
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
    asResponse: true,
  });
  await throwIfNotOk(response.response);
  return convertAllCasesToCamel(decodeCasesResponse(response.body));
};

export const postCase = async (newCase: CaseRequest): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(`${CASES_URL}`, {
    method: 'POST',
    asResponse: true,
    body: JSON.stringify(newCase),
  });
  await throwIfNotOk(response.response);
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response.body));
};

export const patchCase = async (
  caseId: string,
  updatedCase: Partial<CaseRequest>,
  version: string
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}`, {
    method: 'PATCH',
    asResponse: true,
    body: JSON.stringify({ ...updatedCase, id: caseId, version }),
  });
  await throwIfNotOk(response.response);
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response.body));
};

export const postComment = async (newComment: CommentRequest, caseId: string): Promise<Comment> => {
  const response = await KibanaServices.get().http.fetch<CommentResponse>(
    `${CASES_URL}/${caseId}/comments`,
    {
      method: 'POST',
      asResponse: true,
      body: JSON.stringify(newComment),
    }
  );
  await throwIfNotOk(response.response);
  return convertToCamelCase<CommentResponse, Comment>(decodeCommentResponse(response.body));
};

export const patchComment = async (
  commentId: string,
  commentUpdate: string,
  version: string
): Promise<Partial<Comment>> => {
  const response = await KibanaServices.get().http.fetch<CommentResponse>(`${CASES_URL}/comments`, {
    method: 'PATCH',
    asResponse: true,
    body: JSON.stringify({ comment: commentUpdate, id: commentId, version }),
  });
  await throwIfNotOk(response.response);
  return convertToCamelCase<CommentResponse, Comment>(decodeCommentResponse(response.body));
};
