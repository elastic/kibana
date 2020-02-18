/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllCases, AllCasesSnake, Case, CaseSnake } from './types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const convertCaseToCamel = (snakeCase: CaseSnake): Case => ({
  caseId: snakeCase.case_id,
  createdAt: snakeCase.created_at,
  createdBy: snakeCase.created_by,
  description: snakeCase.description,
  state: snakeCase.state,
  tags: snakeCase.tags,
  title: snakeCase.title,
  updatedAt: snakeCase.updated_at,
});

export const convertAllCasesToCamel = (snakeCases: AllCasesSnake): AllCases => ({
  cases: snakeCases.cases.map(snakeCase => convertCaseToCamel(snakeCase)),
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});

export const convertUpdateCaseToCamel = (snakeCase: Partial<CaseSnake>): Partial<Case> => {
  const updateCase: Partial<Case> = {};
  Object.keys(snakeCase).forEach(key => {
    switch (key) {
      case 'case_id':
        updateCase.caseId = snakeCase.case_id;
        break;

      case 'created_at':
        updateCase.createdAt = snakeCase.created_at;
        break;
      case 'created_by':
        updateCase.createdBy = snakeCase.created_by;
        break;
      case 'description':
        updateCase.description = snakeCase.description;
        break;
      case 'state':
        updateCase.state = snakeCase.state;
        break;
      case 'tags':
        updateCase.tags = snakeCase.tags;
        break;
      case 'title':
        updateCase.title = snakeCase.title;
        break;
      case 'updated_at':
        updateCase.updatedAt = snakeCase.updated_at;
        break;
      default:
        return null;
    }
  });
  return updateCase;
};
