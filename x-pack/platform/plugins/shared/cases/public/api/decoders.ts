/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesFindResponse,
  CasesBulkGetResponse,
  CasesMetricsResponse,
  CasesSimilarResponse,
} from '../../common/types/api';
import {
  CasesFindResponseSchema,
  CasesBulkGetResponseSchema,
  CasesMetricsResponseSchema,
  CasesSimilarResponseSchema,
} from '../../common/types/api';
import { decodeWithToasterError } from '../containers/utils';

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  decodeWithToasterError(CasesFindResponseSchema, respCases);

export const decodeCasesMetricsResponse = (metrics?: CasesMetricsResponse) =>
  decodeWithToasterError(CasesMetricsResponseSchema, metrics);

export const decodeCasesBulkGetResponse = (res: CasesBulkGetResponse) => {
  decodeWithToasterError(CasesBulkGetResponseSchema, res);
  return res;
};

export const decodeCasesSimilarResponse = (respCases?: CasesSimilarResponse) =>
  decodeWithToasterError(CasesSimilarResponseSchema, respCases);
