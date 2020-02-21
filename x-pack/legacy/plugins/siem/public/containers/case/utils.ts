/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase, isArray, isObject, set } from 'lodash';
import { AllCases, AllCasesSnake, Case, CaseSnake } from './types';

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

export const convertAllCasesToCamel = (snakeCases: AllCasesSnake): AllCases => ({
  cases: snakeCases.cases.map(snakeCase => convertToCamelCase<CaseSnake, Case>(snakeCase)),
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});
