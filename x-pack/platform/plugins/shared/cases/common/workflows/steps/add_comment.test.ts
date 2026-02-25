/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AddCommentStepTypeId,
  InputSchema,
  OutputSchema,
  addCommentStepCommonDefinition,
} from './add_comment';
import { addCommentInputFixture, createCaseResponseFixture, caseIdFixture } from './test_fixtures';

describe('add_comment common step definition', () => {
  it('exposes the expected step id', () => {
    expect(addCommentStepCommonDefinition.id).toBe(AddCommentStepTypeId);
  });

  it('accepts valid add comment input', () => {
    expect(InputSchema.safeParse(addCommentInputFixture).success).toBe(true);
  });

  it('rejects empty comment', () => {
    expect(
      InputSchema.safeParse({
        case_id: caseIdFixture,
        comment: '',
      }).success
    ).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });
});
