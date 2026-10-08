/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachImpactRequestSchema, impactSchema } from './impact';

const base = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('impactSchema', () => {
  it('accepts a document written before summary and evidence existed', () => {
    expect(impactSchema.safeParse({ ...base, entities: [{ id: 'host-1' }] }).success).toBe(true);
  });

  it('accepts a summary-only document and per-entity evidence', () => {
    expect(impactSchema.safeParse({ ...base, summary: 'Checkout failed' }).success).toBe(true);
    expect(
      impactSchema.safeParse({
        ...base,
        summary: 'Two services degraded',
        entities: [
          { id: 'a', evidence: { description: 'Latency doubled' } },
          { id: 'b', evidence: { description: 'Errors rose' } },
        ],
        updatedAt: '2026-09-01T00:10:00.000Z',
      }).success
    ).toBe(true);
  });

  it('accepts an empty entity list on the stored document', () => {
    expect(impactSchema.safeParse({ ...base, entities: [] }).success).toBe(true);
  });
});

describe('attachImpactRequestSchema', () => {
  it('still requires at least one entity', () => {
    expect(
      attachImpactRequestSchema.safeParse({ conversationId: 'conv-1', entities: [] }).success
    ).toBe(false);
    expect(
      attachImpactRequestSchema.safeParse({ conversationId: 'conv-1', entities: [{ id: 'a' }] })
        .success
    ).toBe(true);
  });
});
