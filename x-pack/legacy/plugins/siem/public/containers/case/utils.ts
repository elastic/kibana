/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase, isObject, set } from 'lodash';
import { AllCases, AllCasesSnake, Case, CaseSnake } from './types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const convertToCamelCase = <T, U extends {}>(snakeCase: T): U => {
  console.log('snakeCase', snakeCase);
  return Object.entries(snakeCase).reduce((acc, [key, value]) => {
    if (isObject(value)) {
      set(camelCase(key), convertToCamelCase(value), acc);
    } else {
      set(camelCase(key), value, acc);
    }
    return acc;
  }, {} as U);
};

export const convertAllCasesToCamel = (snakeCases: AllCasesSnake): AllCases => ({
  cases: snakeCases.cases.map(snakeCase => convertToCamelCase<CaseSnake, Case>(snakeCase)),
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});
