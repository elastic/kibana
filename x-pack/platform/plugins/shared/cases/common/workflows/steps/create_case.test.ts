/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConfigSchema,
  CreateCaseStepTypeId,
  InputSchema,
  OutputSchema,
  createCaseStepCommonDefinition,
} from './create_case';
import { createCaseRequestFixture, createCaseResponseFixture } from '../../fixtures/create_case';

describe('create_case common step definition', () => {
  it('exposes the expected step id and schemas', () => {
    expect(CreateCaseStepTypeId).toBe('cases.createCase');
    expect(createCaseStepCommonDefinition.id).toBe(CreateCaseStepTypeId);
    expect(createCaseStepCommonDefinition.inputSchema).toBe(InputSchema);
    expect(createCaseStepCommonDefinition.outputSchema).toBe(OutputSchema);
    expect(createCaseStepCommonDefinition.configSchema).toBe(ConfigSchema);
  });

  it('accepts valid create case input', () => {
    expect(InputSchema.safeParse(createCaseRequestFixture).success).toBe(true);
  });

  it('rejects invalid create case input', () => {
    const invalidInput = {
      ...createCaseRequestFixture,
      title: undefined,
    };

    expect(InputSchema.safeParse(invalidInput).success).toBe(false);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });

  it('rejects invalid output payload', () => {
    const invalidOutput = {
      case: {
        ...createCaseResponseFixture,
        status: 'not-a-valid-status',
      },
    };

    expect(OutputSchema.safeParse(invalidOutput).success).toBe(false);
  });

  it('validates config schema', () => {
    expect(ConfigSchema.safeParse({ id: 'step-1' }).success).toBe(true);
    expect(ConfigSchema.safeParse({}).success).toBe(false);
  });
});
