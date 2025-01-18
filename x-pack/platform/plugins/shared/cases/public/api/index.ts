/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  CasesFindRequest,
  CasesFindResponse,
  CasesBulkGetRequest,
  CasesBulkGetResponse,
  CasesMetricsRequest,
  CasesMetricsResponse,
} from '../../common/types/api';
import type { CasesMetrics, CasesFindResponseUI } from '../../common/ui';
import {
  CASE_FIND_URL,
  INTERNAL_CASE_METRICS_URL,
  INTERNAL_BULK_GET_CASES_URL,
} from '../../common/constants';
import { convertAllCasesToCamel, convertToCamelCase } from './utils';
import {
  decodeCasesBulkGetResponse,
  decodeCasesFindResponse,
  decodeCasesMetricsResponse,
} from './decoders';

export interface HTTPService {
  http: HttpStart;
  signal?: AbortSignal;
}

export const getCases = async ({
  http,
  signal,
  query,
}: HTTPService & { query: CasesFindRequest }): Promise<CasesFindResponseUI> => {
  const res = await http.get<CasesFindResponse>(CASE_FIND_URL, { query, signal });
  return convertAllCasesToCamel(decodeCasesFindResponse(res));
};

export const getCasesMetrics = async ({
  http,
  signal,
  query,
}: HTTPService & { query: CasesMetricsRequest }): Promise<CasesMetrics> => {
  const res = await http.get<CasesMetricsResponse>(INTERNAL_CASE_METRICS_URL, { signal, query });
  return convertToCamelCase(decodeCasesMetricsResponse(res));
};

export const bulkGetCases = async ({
  http,
  signal,
  params,
}: HTTPService & { params: CasesBulkGetRequest }): Promise<CasesBulkGetResponse> => {
  const res = await http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
    body: JSON.stringify({ ...params }),
    signal,
  });

  return decodeCasesBulkGetResponse(res);
};
