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
import { createCaseResponseFixture } from '../../fixtures/create_case';

describe('update_cases common step definition', () => {
  it('exposes the expected step id', () => {
    expect(updateCasesStepCommonDefinition.id).toBe(UpdateCasesStepTypeId);
  });

  it('accepts valid update cases input', () => {
    expect(
      InputSchema.safeParse({
        cases: [
          {
            case_id: 'case-1',
            updates: { title: 'Updated title' },
          },
        ],
      }).success
    ).toBe(true);
  });

  it('accepts valid update cases input with version', () => {
    expect(
      InputSchema.safeParse({
        cases: [
          {
            case_id: 'case-1',
            version: 'WzQ3LDFd',
            updates: { title: 'Updated title' },
          },
        ],
      }).success
    ).toBe(true);
  });

  it('rejects update cases input with empty updates', () => {
    expect(
      InputSchema.safeParse({
        cases: [
          {
            case_id: 'case-1',
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
