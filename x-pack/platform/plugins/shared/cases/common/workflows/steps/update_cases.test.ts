/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UpdateCasesStepTypeId,
  InputSchema,
  OutputSchema,
  updateCasesStepCommonDefinition,
} from './update_cases';
import {
  createCaseResponseFixture,
  updateCasesInputFixture,
  updateCasesInputWithVersionFixture,
  caseIdFixture,
} from './test_fixtures';

describe('update_cases common step definition', () => {
  it('exposes the expected step id', () => {
    expect(updateCasesStepCommonDefinition.id).toBe(UpdateCasesStepTypeId);
  });

  it('accepts valid update cases input', () => {
    expect(InputSchema.safeParse(updateCasesInputFixture).success).toBe(true);
  });

  it('accepts valid update cases input with version', () => {
    expect(InputSchema.safeParse(updateCasesInputWithVersionFixture).success).toBe(true);
  });

  it('rejects update cases input with empty updates', () => {
    expect(
      InputSchema.safeParse({
        cases: [
          {
            case_id: caseIdFixture,
            updates: {},
          },
        ],
      }).success
    ).toBe(false);
  });

  it('rejects update cases input when cases is empty', () => {
    expect(
      InputSchema.safeParse({
        cases: [],
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ cases: [createCaseResponseFixture] }).success).toBe(true);
  });
});
