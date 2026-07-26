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
import { findCasesInputFixture, findCasesOutputFixture } from './test_fixtures';

describe('find_cases common step definition', () => {
  it('exposes the expected step id', () => {
    expect(findCasesStepCommonDefinition.id).toBe(FindCasesStepTypeId);
  });

  it('accepts valid find cases input', () => {
    expect(InputSchema.safeParse(findCasesInputFixture).success).toBe(true);
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
    expect(OutputSchema.safeParse(findCasesOutputFixture).success).toBe(true);
  });
});
