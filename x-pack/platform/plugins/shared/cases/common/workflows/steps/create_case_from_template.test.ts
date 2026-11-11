/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateCaseFromTemplateStepTypeId,
  createCaseFromTemplateStepCommonDefinition,
} from './create_case_from_template';

describe('create_case_from_template common step definition', () => {
  const baseInput = {
    owner: 'securitySolution' as const,
    case_template_id: 'triage_template',
  };

  it('exposes the expected step id', () => {
    expect(createCaseFromTemplateStepCommonDefinition.id).toBe(CreateCaseFromTemplateStepTypeId);
  });

  it('accepts valid create case from template input', () => {
    expect(
      createCaseFromTemplateStepCommonDefinition.inputSchema.safeParse(baseInput).success
    ).toBe(true);
  });

  it('accepts overwrites with extended_fields', () => {
    expect(
      createCaseFromTemplateStepCommonDefinition.inputSchema.safeParse({
        ...baseInput,
        overwrites: {
          extended_fields: { priority_as_keyword: 'high' },
        },
      }).success
    ).toBe(true);
  });

  it('rejects overwrites with non-string extended_fields values', () => {
    expect(
      createCaseFromTemplateStepCommonDefinition.inputSchema.safeParse({
        ...baseInput,
        overwrites: {
          extended_fields: { priority_as_keyword: 42 },
        },
      }).success
    ).toBe(false);
  });
});
