/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/Either';
import { identity } from 'fp-ts/function';
import { pipe } from 'fp-ts/pipeable';

import type {
  CasesFindResponse,
  CasesSearchResponse,
  CasesBulkGetResponse,
  CasesMetricsResponse,
  CasesSimilarResponse,
} from '../../common/types/api';
import {
  CasesFindResponseRt,
  CasesSearchResponseRt,
  CasesBulkGetResponseRt,
  CasesMetricsResponseRt,
  CasesSimilarResponseRt,
} from '../../common/types/api';
import { createToasterPlainError } from '../containers/utils';
import { throwErrors } from '../../common';

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  pipe(CasesFindResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));

/**
 * Decodes the internal `_search` response, which is a superset of the public `_find` response that
 * additionally carries `mttr` for the cases list metrics bar. Using the search RT here (rather than
 * `CasesFindResponseRt`) keeps the strict decode from stripping/rejecting the `mttr` key.
 */
export const decodeCasesSearchResponse = (respCases?: CasesSearchResponse) =>
  pipe(
    CasesSearchResponseRt.decode(respCases),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesMetricsResponse = (metrics?: CasesMetricsResponse) =>
  pipe(
    CasesMetricsResponseRt.decode(metrics),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesBulkGetResponse = (res: CasesBulkGetResponse) => {
  pipe(CasesBulkGetResponseRt.decode(res), fold(throwErrors(createToasterPlainError), identity));

  return res;
};

export const decodeCasesSimilarResponse = (respCases?: CasesSimilarResponse) =>
  pipe(
    CasesSimilarResponseRt.decode(respCases),
    fold(throwErrors(createToasterPlainError), identity)
  );
