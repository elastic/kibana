/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateCaseStepTypeId,
  InputSchema,
  OutputSchema,
  createCaseStepCommonDefinition,
} from './create_case';
import { createCaseRequestFixture, createCaseResponseFixture } from '../../fixtures/create_case';

describe('create_case common step definition', () => {
  it('exposes the expected step id', () => {
    expect(createCaseStepCommonDefinition.id).toBe(CreateCaseStepTypeId);
  });

  it('accepts valid create case input', () => {
    expect(InputSchema.safeParse(createCaseRequestFixture).success).toBe(true);
  });

  it('accepts create case input without connector', () => {
    const { connector: _connector, ...inputWithoutConnector } = createCaseRequestFixture;
    expect(InputSchema.safeParse(inputWithoutConnector).success).toBe(true);
  });

  it('accepts create case input without tags', () => {
    const { tags: _tags, ...inputWithoutTags } = createCaseRequestFixture;
    expect(InputSchema.safeParse(inputWithoutTags).success).toBe(true);
  });

  it('accepts create case input without settings', () => {
    const { settings: _settings, ...inputWithoutSettings } = createCaseRequestFixture;
    expect(InputSchema.safeParse(inputWithoutSettings).success).toBe(true);
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
});
