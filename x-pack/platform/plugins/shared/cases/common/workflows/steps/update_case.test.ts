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
import { createCaseResponseFixture } from '../../fixtures/create_case';

describe('update_case common step definition', () => {
  it('exposes the expected step id', () => {
    expect(updateCaseStepCommonDefinition.id).toBe(UpdateCaseStepTypeId);
  });

  it('accepts valid update case input', () => {
    expect(
      InputSchema.safeParse({
        case_id: 'case-1',
        updates: { title: 'Updated title' },
      }).success
    ).toBe(true);
  });

  it('rejects update case input without updates', () => {
    expect(
      InputSchema.safeParse({
        case_id: 'case-1',
        updates: {},
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });
});
