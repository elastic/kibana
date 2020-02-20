/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../lib/kibana';
import { AllCases, FetchCasesProps, Case, NewCase, SortFieldCase } from './types';
import { Direction } from '../../graphql/types';
import { throwIfNotOk } from '../../hooks/api/api';
import { CASES_URL } from './constants';

export const getCase = async (caseId: string, includeComments: boolean) => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/${caseId}`, {
    method: 'GET',
    asResponse: true,
    query: {
      includeComments,
    },
  });
  await throwIfNotOk(response.response);
  return response.body!;
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
    sortOrder: Direction.desc,
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
    asResponse: true,
  });
  await throwIfNotOk(response.response);
  return response.body!;
};

export const createCase = async (newCase: NewCase): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}`, {
    method: 'POST',
    asResponse: true,
    body: JSON.stringify(newCase),
  });
  await throwIfNotOk(response.response);
  return response.body!;
};

export const updateCaseProperty = async (
  caseId: string,
  updatedCase: Partial<Case>
): Promise<Partial<Case>> => {
  const response = await KibanaServices.get().http.fetch(`${CASES_URL}/${caseId}`, {
    method: 'PATCH',
    asResponse: true,
    body: JSON.stringify(updatedCase),
  });
  await throwIfNotOk(response.response);
  return response.body!;
};
