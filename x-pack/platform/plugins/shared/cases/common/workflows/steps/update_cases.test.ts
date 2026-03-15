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
import { MAX_CASES_TO_UPDATE } from '../../constants';

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

  it('accepts update cases input with max cases', () => {
    const cases = Array.from({ length: MAX_CASES_TO_UPDATE }, (_, index) => ({
      case_id: `case-${index}`,
      updates: { title: `title-${index}` },
    }));

    expect(
      InputSchema.safeParse({
        cases,
      }).success
    ).toBe(true);
  });

  it('rejects update cases input when cases exceeds max', () => {
    const cases = Array.from({ length: MAX_CASES_TO_UPDATE + 1 }, (_, index) => ({
      case_id: `case-${index}`,
      updates: { title: `title-${index}` },
    }));

    expect(
      InputSchema.safeParse({
        cases,
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ cases: [createCaseResponseFixture] }).success).toBe(true);
  });

  it('accepts output payload with max cases', () => {
    const cases = Array.from({ length: MAX_CASES_TO_UPDATE }, () => createCaseResponseFixture);

    expect(OutputSchema.safeParse({ cases }).success).toBe(true);
  });

  it('rejects output payload when cases exceeds max', () => {
    const cases = Array.from({ length: MAX_CASES_TO_UPDATE + 1 }, () => createCaseResponseFixture);

    expect(OutputSchema.safeParse({ cases }).success).toBe(false);
  });
});
