/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCompositeSLOParamsSchema } from './composite_slo_create';

const BASE_BODY = {
  name: 'My composite SLO',
  description: 'irrelevant',
  compositeMethod: 'weightedAverage',
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
};

const buildRequest = (members: Array<{ sloId: string; weight: number; instanceId?: string }>) => ({
  body: { ...BASE_BODY, members },
});

describe('CreateCompositeSLO schema validation', () => {
  it('accepts members that are unique by sloId and instanceId', () => {
    const request = buildRequest([
      { sloId: 'slo-id-1', weight: 1 },
      { sloId: 'slo-id-2', weight: 1 },
      { sloId: 'slo-id-1', weight: 1, instanceId: 'host-1' },
      { sloId: 'slo-id-1', weight: 1, instanceId: 'host-2' },
    ]);

    const result = createCompositeSLOParamsSchema.safeParse(request);

    expect(result.success).toBe(true);
  });

  it('rejects duplicate members with the same sloId and instanceId', () => {
    const request = buildRequest([
      { sloId: 'slo-id-1', weight: 1, instanceId: 'host-1' },
      { sloId: 'slo-id-1', weight: 2, instanceId: 'host-1' },
    ]);

    const result = createCompositeSLOParamsSchema.safeParse(request);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Composite SLO members must be unique by sloId and instanceId'
    );
  });

  it('rejects duplicate members with the same sloId and no instanceId', () => {
    const request = buildRequest([
      { sloId: 'slo-id-1', weight: 1 },
      { sloId: 'slo-id-1', weight: 2 },
    ]);

    const result = createCompositeSLOParamsSchema.safeParse(request);

    expect(result.success).toBe(false);
  });
});
