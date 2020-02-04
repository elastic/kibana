/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  FetchCasesProps,
  FetchCasesResponse,
  NewCase,
  NewCaseFormatted,
  SortFieldCase,
} from './types';
import { Direction } from '../../graphql/types';
import { throwIfNotOk } from '../../hooks/api/api';
import { CASES_URL } from './constants';

export const fetchCases = async ({
  filterOptions = {
    search: '',
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: Direction.desc,
  },
}: FetchCasesProps): Promise<FetchCasesResponse> => {
  let queryParams = Object.entries(pagination).reduce(
    (acc, [key, value]) => `${acc}${key}=${value}&`,
    '?'
  );
  const tags = [
    ...(filterOptions.tags?.map(t => `case-workflow.attributes.tags:${encodeURIComponent(t)}`) ??
      []),
  ];

  const tagParams = `filter=${tags.join('%20AND%20')}&`;
  const searchParams = `search=${
    filterOptions.search // filterOptions.search.length > 0 ? `*${filterOptions.search}*` : filterOptions.search
  }&`;
  queryParams = `${queryParams}${tagParams}${searchParams}`;
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

export const createCase = async (newCase: NewCase): Promise<NewCaseFormatted> => {
  const response = await fetch(`${chrome.getBasePath()}${CASES_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
    body: JSON.stringify(newCase),
  });
  await throwIfNotOk(response);
  return response.json();
};
