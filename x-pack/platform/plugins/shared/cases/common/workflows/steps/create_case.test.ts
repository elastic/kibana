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
import { createCaseRequestFixture, createCaseResponseFixture } from './test_fixtures';

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

  it('accepts create case input with extended_fields', () => {
    const inputWithExtendedFields = {
      ...createCaseRequestFixture,
      extended_fields: { priority_as_keyword: 'high' },
    };
    expect(InputSchema.safeParse(inputWithExtendedFields).success).toBe(true);
  });

  it('rejects create case input with non-string extended_fields values', () => {
    const inputWithInvalidExtendedFields = {
      ...createCaseRequestFixture,
      extended_fields: { priority_as_keyword: 42 },
    };
    expect(InputSchema.safeParse(inputWithInvalidExtendedFields).success).toBe(false);
  });

  it('rejects invalid create case input', () => {
    const invalidInput = {
      ...createCaseRequestFixture,
      title: undefined,
    };

    expect(InputSchema.safeParse(invalidInput).success).toBe(false);
  });

  it('accepts extended_fields on create case input', () => {
    const inputWithExtendedFields = {
      ...createCaseRequestFixture,
      extended_fields: {
        priority_as_keyword: 'high',
        ticket_number_as_integer: '4287',
      },
    };

    expect(InputSchema.safeParse(inputWithExtendedFields).success).toBe(true);
  });

  it('accepts a template reference on create case input', () => {
    const inputWithTemplate = {
      ...createCaseRequestFixture,
      template: { id: 'triage_template', version: 3 },
    };

    expect(InputSchema.safeParse(inputWithTemplate).success).toBe(true);
  });

  it('accepts valid output payload', () => {
    expect(OutputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
  });

  it('accepts extended_fields and extended_fields_labels on the output payload', () => {
    const responseWithExtendedFields = {
      case: {
        ...createCaseResponseFixture,
        extended_fields: { priority_as_keyword: 'high' },
        extended_fields_labels: { priority_as_keyword: 'Priority' },
      },
    };

    expect(OutputSchema.safeParse(responseWithExtendedFields).success).toBe(true);
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
