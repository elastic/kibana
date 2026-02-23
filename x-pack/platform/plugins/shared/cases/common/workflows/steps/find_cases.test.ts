/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindCasesStepTypeId,
  InputSchema,
  OutputSchema,
  findCasesStepCommonDefinition,
} from './find_cases';
import { createCaseResponseFixture } from '../../fixtures/create_case';

describe('find_cases common step definition', () => {
  it('exposes the expected step id', () => {
    expect(findCasesStepCommonDefinition.id).toBe(FindCasesStepTypeId);
  });

  it('accepts valid find cases input', () => {
    expect(
      InputSchema.safeParse({
        owner: 'securitySolution',
        status: ['open', 'in-progress'],
        severity: 'high',
        search: 'incident',
        searchFields: ['title', 'description'],
        sortField: 'updatedAt',
        sortOrder: 'desc',
        tags: ['tag-1', 'tag-2'],
        page: 1,
        perPage: 20,
      }).success
    ).toBe(true);
  });

  it('accepts incremental_id.text in searchFields', () => {
    expect(
      InputSchema.safeParse({
        searchFields: 'incremental_id.text',
      }).success
    ).toBe(true);
  });

  it('rejects invalid sortField', () => {
    expect(
      InputSchema.safeParse({
        sortField: 'invalid',
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(
      OutputSchema.safeParse({
        cases: [createCaseResponseFixture],
        count_closed_cases: 0,
        count_in_progress_cases: 0,
        count_open_cases: 1,
        page: 1,
        per_page: 20,
        total: 1,
      }).success
    ).toBe(true);
  });
});
