/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nightshiftInvestigationsRouteRepository } from '.';

const endpoint = 'GET /internal/nightshift/investigations/_impacted_entities' as const;
const { handler, params } = nightshiftInvestigationsRouteRepository[endpoint];
const mockRequest = {} as KibanaRequest;

const makeResources = (query: Record<string, unknown>, getImpactedEntities = jest.fn()) => ({
  request: mockRequest,
  params: { query },
  getInvestigationsClient: jest.fn().mockReturnValue({ getImpactedEntities }),
});

describe('GET /internal/nightshift/investigations/_impacted_entities', () => {
  it('accepts date bounds and forwards them to the client', async () => {
    const getImpactedEntities = jest.fn().mockResolvedValue({
      impacted_entities: [{ name: 'checkout', type: 'service' }],
    });
    const query = {
      created_after: '2024-01-01T00:00:00Z',
      created_before: '2024-01-31T00:00:00Z',
      started_after: '2024-01-02T00:00:00Z',
      started_before: '2024-01-30T00:00:00Z',
      completed_after: '2024-01-03T00:00:00Z',
      completed_before: '2024-01-29T00:00:00Z',
    };

    await expect(handler(makeResources(query, getImpactedEntities) as never)).resolves.toEqual({
      impacted_entities: [{ name: 'checkout', type: 'service' }],
    });
    expect(getImpactedEntities).toHaveBeenCalledWith(query);
  });

  it('rejects malformed date bounds', () => {
    expect(() => params.parse({ query: { started_after: 'not-a-date' } })).toThrow();
  });
});
