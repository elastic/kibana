/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import type {
  CasesFindResponse,
  CasesBulkGetResponse,
  CasesMetricsResponse,
  CasesSimilarResponse,
} from '../../common/types/api';
import {
  CasesFindResponseRt,
  CasesBulkGetResponseRt,
  CasesMetricsResponseRt,
  CasesSimilarResponseRt,
} from '../../common/types/api';
import { createToasterPlainError } from '../containers/utils';
import { throwErrors } from '../../common';

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  pipe(CasesFindResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));
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
