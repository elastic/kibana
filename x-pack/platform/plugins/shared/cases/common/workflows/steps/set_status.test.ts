/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStatusStepCommonDefinition } from './set_status';
import { caseIdFixture, setStatusInputFixture } from './test_fixtures';

describe('set_status common step definition', () => {
  const { inputSchema } = setStatusStepCommonDefinition;

  it('accepts a category status', () => {
    expect(inputSchema.safeParse(setStatusInputFixture).success).toBe(true);
  });

  it('accepts a configured status key with a pause reason', () => {
    expect(
      inputSchema.safeParse({
        case_id: caseIdFixture,
        status_key: 'on_hold',
        pause_reason: 'Awaiting vendor',
      }).success
    ).toBe(true);
  });

  it('rejects input with neither status nor status key', () => {
    expect(inputSchema.safeParse({ case_id: caseIdFixture }).success).toBe(false);
  });
});
