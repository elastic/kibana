/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  reopenInvestigationStepInputSchema,
  reopenInvestigationStepOutputSchema,
} from './reopen_investigation_step';

describe('investigations.reopen input schema', () => {
  it('should require a non-empty conversationId', () => {
    expect(reopenInvestigationStepInputSchema.safeParse({ conversationId: '' }).success).toBe(
      false
    );
    expect(reopenInvestigationStepInputSchema.safeParse({ conversationId: 'conv-1' }).success).toBe(
      true
    );
  });

  it('should reject a conversationId that exceeds 256 characters', () => {
    expect(
      reopenInvestigationStepInputSchema.safeParse({ conversationId: 'a'.repeat(257) }).success
    ).toBe(false);
    expect(
      reopenInvestigationStepInputSchema.safeParse({ conversationId: 'a'.repeat(256) }).success
    ).toBe(true);
  });

  it('should convert to a JSON schema the YAML editor can use', () => {
    const jsonSchema = z.toJSONSchema(reopenInvestigationStepInputSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'ref',
    }) as { properties: Record<string, unknown>; required?: string[] };

    expect(Object.keys(jsonSchema.properties)).toEqual(
      Object.keys(reopenInvestigationStepInputSchema.shape)
    );
    expect(jsonSchema.required).toEqual(['conversationId']);
  });
});

describe('investigations.reopen output schema', () => {
  it('should require reopened and title', () => {
    expect(
      reopenInvestigationStepOutputSchema.safeParse({ reopened: true, title: 'My Investigation' })
        .success
    ).toBe(true);
    expect(reopenInvestigationStepOutputSchema.safeParse({ reopened: false }).success).toBe(false);
  });
});
