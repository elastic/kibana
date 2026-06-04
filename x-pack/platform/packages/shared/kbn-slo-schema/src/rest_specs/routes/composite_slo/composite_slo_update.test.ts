/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCompositeSLOParamsSchema } from './composite_slo_update';

const buildRequest = (members?: Array<{ sloId: string; weight: number; instanceId?: string }>) => ({
  path: { id: 'composite-slo-id' },
  body: members ? { members } : {},
});

describe('UpdateCompositeSLO schema validation', () => {
  it('accepts a request without members', () => {
    const result = updateCompositeSLOParamsSchema.safeParse(buildRequest());

    expect(result.success).toBe(true);
  });

  it('accepts members that are unique by sloId and instanceId', () => {
    const request = buildRequest([
      { sloId: 'slo-id-1', weight: 1 },
      { sloId: 'slo-id-1', weight: 1, instanceId: 'host-1' },
    ]);

    const result = updateCompositeSLOParamsSchema.safeParse(request);

    expect(result.success).toBe(true);
  });

  it('rejects duplicate members with the same sloId and instanceId', () => {
    const request = buildRequest([
      { sloId: 'slo-id-1', weight: 1, instanceId: 'host-1' },
      { sloId: 'slo-id-1', weight: 2, instanceId: 'host-1' },
    ]);

    const result = updateCompositeSLOParamsSchema.safeParse(request);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Composite SLO members must be unique by sloId and instanceId'
    );
  });
});
