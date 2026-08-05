/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { internalEventsRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const investigateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigate'];
const eventsSearchRoute = internalEventsRoutes['GET /internal/significant_events/events'];
const lifecycleRoute =
  internalEventsRoutes['GET /internal/significant_events/events/{id}/lifecycle'];

type HandlerParams = Parameters<typeof investigateRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

describe('POST /internal/significant_events/events/{id}/investigate', () => {
  it('rejects with 409 while paused before loading the event', async () => {
    const findByEventUuid = jest.fn();
    const handlerParams = {
      params: { path: { id: 'event-1' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => ({ findByEventUuid }),
      }),
      server: { workflowsManagement: {}, agentBuilder: {}, spaces: {} },
      logger: { warn: jest.fn(), get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as HandlerParams;

    await expect(investigateRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(findByEventUuid).not.toHaveBeenCalled();
  });
});

describe('GET /internal/significant_events/events', () => {
  it('serializes the response-only lineage creation timestamp', async () => {
    const event = {
      '@timestamp': '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      event_uuid: 'version-2',
      event_id: 'event-1',
      status: 'open' as const,
      stream_names: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });

    const response = await eventsSearchRoute.handler({
      params: { query: {} },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
    } as never);

    expect(response).toEqual({
      hits: [event],
      page: 1,
      perPage: 25,
      total: 1,
    });
  });
});

describe('GET /internal/significant_events/events/{id}/lifecycle', () => {
  it('adds the earliest lineage timestamp for deep-linked events', async () => {
    const firstVersion = {
      '@timestamp': '2026-01-01T00:00:00+05:00',
      event_uuid: 'version-1',
      event_id: 'event-1',
      status: 'open' as const,
      stream_names: ['logs.test'],
      title: 'Test event',
      summary: 'Test summary',
      severity: '40-medium' as const,
      confidence: 0.8,
    };
    const latestVersion = {
      ...firstVersion,
      '@timestamp': '2025-12-31T20:00:00Z',
      event_uuid: 'version-2',
      previous_event_uuid: firstVersion.event_uuid,
      status: 'closed' as const,
    };

    const response = await lifecycleRoute.handler({
      params: { path: { id: latestVersion.event_uuid } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => ({
          findByEventUuid: jest.fn().mockResolvedValue({ hits: [latestVersion] }),
          findByEventId: jest.fn().mockResolvedValue({ hits: [firstVersion, latestVersion] }),
        }),
        getDetectionClient: () => ({ findByIds: jest.fn().mockResolvedValue({ hits: [] }) }),
      }),
      server: {},
    } as never);

    expect(response.events).toEqual([
      { ...firstVersion, created_at: firstVersion['@timestamp'] },
      { ...latestVersion, created_at: firstVersion['@timestamp'] },
    ]);
  });
});
