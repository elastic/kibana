/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesFindResponse,
  CasesSearchResponse,
  CasesBulkGetResponse,
  CasesMetricsResponse,
  CasesSimilarResponse,
} from '../../common/types/api';
import {
  CasesFindResponseSchema,
  CasesSearchResponseSchema,
  CasesBulkGetResponseSchema,
  CasesMetricsResponseSchema,
  CasesSimilarResponseSchema,
} from '../../common/types/api';
import { decodeWithToasterError } from '../containers/utils';

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  decodeWithToasterError(CasesFindResponseSchema, respCases);

/**
 * Decodes the internal `_search` response, which is a superset of the public `_find` response that
 * additionally carries `mttr` for the cases list metrics bar. Using the search schema here (rather
 * than `CasesFindResponseSchema`) keeps the decode from stripping the `mttr` key.
 */
export const decodeCasesSearchResponse = (respCases?: CasesSearchResponse) =>
  decodeWithToasterError(CasesSearchResponseSchema, respCases);

export const decodeCasesMetricsResponse = (metrics?: CasesMetricsResponse) =>
  decodeWithToasterError(CasesMetricsResponseSchema, metrics);

export const decodeCasesBulkGetResponse = (res: CasesBulkGetResponse) => {
  decodeWithToasterError(CasesBulkGetResponseSchema, res);
  return res;
};

export const decodeCasesSimilarResponse = (respCases?: CasesSimilarResponse) =>
  decodeWithToasterError(CasesSimilarResponseSchema, respCases);
