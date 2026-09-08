/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SetCustomFieldStepTypeId,
  InputSchema,
  OutputSchema,
  setCustomFieldStepCommonDefinition,
} from './set_custom_field';
import {
  createCaseResponseFixture,
  setCustomFieldTextInputFixture,
  setCustomFieldToggleInputFixture,
  setCustomFieldNumberInputFixture,
  setCustomFieldNullInputFixture,
  caseIdFixture,
  caseVersionFixture,
} from './test_fixtures';

describe('set_custom_field common step definition', () => {
  it('exposes the expected step id', () => {
    expect(setCustomFieldStepCommonDefinition.id).toBe(SetCustomFieldStepTypeId);
  });

  it('accepts valid text custom field update input', () => {
    expect(InputSchema.safeParse(setCustomFieldTextInputFixture).success).toBe(true);
  });

  it('accepts valid toggle custom field update input', () => {
    expect(InputSchema.safeParse(setCustomFieldToggleInputFixture).success).toBe(true);
  });

  it('accepts valid number custom field update input', () => {
    expect(InputSchema.safeParse(setCustomFieldNumberInputFixture).success).toBe(true);
  });

  it('accepts valid null custom field update input', () => {
    expect(InputSchema.safeParse(setCustomFieldNullInputFixture).success).toBe(true);
  });

  it('accepts valid input with version', () => {
    expect(
      InputSchema.safeParse({
        ...setCustomFieldTextInputFixture,
        version: caseVersionFixture,
      }).success
    ).toBe(true);
  });

  it('rejects invalid input with missing field_name', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        owner: 'securitySolution',
        value: 'new value',
      }).success
    ).toBe(false);
  });

  it('rejects invalid input with missing owner', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        field_name: 'cf_text',
        value: 'new value',
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });
});
