/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase, isArray, isObject, set } from 'lodash';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  CaseResponse,
  CaseResponseRt,
  CasesResponse,
  CasesResponseRt,
  throwErrors,
  CommentResponse,
  CommentResponseRt,
} from '../../../../../../plugins/case/common/api';
import { ToasterErrors } from '../../hooks/api/throw_if_not_ok';
import { AllCases, Case } from './types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      return [...acc, convertArrayToCamelCase(value)];
    } else if (isObject(value)) {
      return [...acc, convertToCamelCase(value)];
    } else {
      return [...acc, value];
    }
  }, []);

export const convertToCamelCase = <T, U extends {}>(snakeCase: T): U =>
  Object.entries(snakeCase).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertAllCasesToCamel = (snakeCases: CasesResponse): AllCases => ({
  cases: snakeCases.cases.map(snakeCase => convertToCamelCase<CaseResponse, Case>(snakeCase)),
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});

export const createToasterPlainError = (message: string) => new ToasterErrors([message]);

export const decodeCaseResponse = (respCase?: CaseResponse) =>
  pipe(CaseResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesResponse = (respCases?: CasesResponse) =>
  pipe(CasesResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));

export const decodeCommentResponse = (respComment?: CommentResponse) =>
  pipe(CommentResponseRt.decode(respComment), fold(throwErrors(createToasterPlainError), identity));
