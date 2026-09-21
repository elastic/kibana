/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncRoutes } from './sync_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = syncRoutes['GET /internal/streams/_knowledge_indicators/_streams_with_indicators'];

type HandlerParams = Parameters<typeof route.handler>[0];

const makeHandlerParams = ({ sourceIds }: { sourceIds: string[] }): HandlerParams =>
  ({
    params: {},
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
        getSourceIdsToReconcile: jest.fn().mockResolvedValue(sourceIds),
      }),
    }),
    server: {} as HandlerParams['server'],
  } as unknown as HandlerParams);

describe('sourcesWithIndicatorsRoute', () => {
  beforeEach(() => {
    (assertSignificantEventsAccess as jest.Mock).mockClear();
  });

  it('maps source ids to the foreach item shape consumed by sync.yaml', async () => {
    const result = await route.handler(
      makeHandlerParams({ sourceIds: ['logs.nginx', 'logs.app'] })
    );

    expect(result).toEqual({
      sources: [{ sourceId: 'logs.nginx' }, { sourceId: 'logs.app' }],
    });
  });

  it('returns an empty list when there is nothing to reconcile', async () => {
    const result = await route.handler(makeHandlerParams({ sourceIds: [] }));

    expect(result).toEqual({ sources: [] });
  });

  it('enforces significant events access', async () => {
    await route.handler(makeHandlerParams({ sourceIds: [] }));

    expect(assertSignificantEventsAccess).toHaveBeenCalledTimes(1);
  });
});
