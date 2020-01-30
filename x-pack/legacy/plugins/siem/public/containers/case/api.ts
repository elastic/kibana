/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { FetchCasesProps, FetchCasesResponse, SortFieldCase } from './types';
import { Direction } from '../../graphql/types';
import { throwIfNotOk } from '../../hooks/api/api';
import { CASES_URL } from './constants';

export const fetchCases = async ({
  filterOptions = {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: Direction.desc,
  },
}: FetchCasesProps): Promise<FetchCasesResponse> => {
  const queryParams = Object.entries(pagination).reduce(
    (acc, [key, value]) => `${acc}${key}=${value}&`,
    '?'
  );
  const response = await fetch(`${chrome.getBasePath()}${CASES_URL}${queryParams}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
  });
  await throwIfNotOk(response);
  return response.json();
};
