/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UpdateCaseStepTypeId,
  InputSchema,
  OutputSchema,
  updateCaseStepCommonDefinition,
} from './update_case';
import {
  createCaseResponseFixture,
  updateCaseInputFixture,
  updateCaseInputWithVersionFixture,
  caseIdFixture,
} from './test_fixtures';

describe('update_case common step definition', () => {
  it('exposes the expected step id', () => {
    expect(updateCaseStepCommonDefinition.id).toBe(UpdateCaseStepTypeId);
  });

  it('accepts valid update case input', () => {
    expect(InputSchema.safeParse(updateCaseInputFixture).success).toBe(true);
  });

  it('accepts valid update case input with version', () => {
    expect(InputSchema.safeParse(updateCaseInputWithVersionFixture).success).toBe(true);
  });

  it('accepts update case input with extended_fields in updates', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        updates: {
          extended_fields: { priority_as_keyword: 'low' },
        },
      }).success
    ).toBe(true);
  });

  it('rejects update case input without updates', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        updates: {},
      }).success
    ).toBe(false);
  });

  it('accepts extended_fields in update case input', () => {
    const extended_fields = { priority_as_keyword: 'high' };
    expect(
      InputSchema.parse({
        case_id: caseIdFixture,
        updates: { extended_fields },
      })
    ).toMatchObject({ updates: { extended_fields } });
  });

  it('accepts a template switch in update case input', () => {
    const template = { id: 'triage_template', version: 3 };
    expect(
      InputSchema.parse({
        case_id: caseIdFixture,
        updates: { template },
      })
    ).toMatchObject({ updates: { template } });
  });

  it('rejects a template switch without a version in update case input', () => {
    // Unlike create, switching a template on update is an explicit versioned action:
    // the version is required and the server does not resolve a latest version here.
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        updates: { template: { id: 'triage_template' } },
      }).success
    ).toBe(false);
  });

  it('accepts clearing the template with null in update case input', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        updates: { template: null },
      }).success
    ).toBe(true);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });
});
