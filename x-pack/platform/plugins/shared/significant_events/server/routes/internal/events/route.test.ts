/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { internalEventsRoutes } from './route';

const mockCleanupStaleEvents = jest.fn();
const mockAttachInvestigationToEvent = jest.fn();

jest.mock('../../../lib/significant_events/events/cleanup_stale_events', () => ({
  cleanupStaleEvents: (...args: unknown[]) => mockCleanupStaleEvents(...args),
}));

jest.mock('../../../lib/significant_events/events/attach_investigation', () => ({
  attachInvestigationToEvent: (...args: unknown[]) => mockAttachInvestigationToEvent(...args),
}));

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const investigateRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigate'];
const attachRoute =
  internalEventsRoutes['POST /internal/significant_events/events/{id}/investigations'];
const eventsSearchRoute = internalEventsRoutes['GET /internal/significant_events/events'];
const lifecycleRoute =
  internalEventsRoutes['GET /internal/significant_events/events/{id}/lifecycle'];
const cleanupRoute = internalEventsRoutes['POST /internal/significant_events/events/_cleanup'];

const attachInvestigationBody = {
  workflow_execution_id: 'exec-1',
  started_at: '2026-01-01T00:00:00.000Z',
  completed_at: '2026-01-01T00:01:00.000Z',
};

const triggerFeedback = [
  {
    field: 'severity' as const,
    from: '40-medium' as const,
    to: '80-critical' as const,
    reason: 'The outage is broader than the original medium rating.',
    evidence: [{ description: 'Error rate stayed above 40% for 20 minutes.' }],
  },
];

type HandlerParams = Parameters<typeof investigateRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

describe('POST /internal/significant_events/events/_cleanup', () => {
  it('runs cleanup with manage-scoped event and rule clients', async () => {
    mockCleanupStaleEvents.mockResolvedValue({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
    const eventClient = {};
    const rulesClient = {};

    const result = await cleanupRoute.handler({
      params: { body: { candidateRuleIds: ['rule-1'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => eventClient,
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ rulesClient }),
      }),
      server: {},
    } as never);

    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventClient,
      rulesClient,
      candidateRuleIds: ['rule-1'],
    });
    expect(result).toEqual({ scanned: 1, closed: 1, kept: 0, skipped: 0 });
  });
});

describe('POST /internal/significant_events/events/{id}/investigations', () => {
  const handlerParams = {
    params: {
      path: { id: 'event-1' },
      body: attachInvestigationBody,
    },
    request: { authzResult: {} },
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      getEventClient: () => ({}),
    }),
    server: {},
    logger: { warn: jest.fn() },
  };

  beforeEach(() => {
    mockAttachInvestigationToEvent.mockReset();
  });

  it('rejects trigger_feedback without Detection Engine manage', async () => {
    await expect(
      attachRoute.handler({
        ...handlerParams,
        params: {
          path: { id: 'event-1' },
          body: { ...attachInvestigationBody, trigger_feedback: triggerFeedback },
        },
      } as never)
    ).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(mockAttachInvestigationToEvent).not.toHaveBeenCalled();
  });

  it('applies trigger_feedback when Detection Engine manage is granted', async () => {
    mockAttachInvestigationToEvent.mockResolvedValue({ updated: 1, ignored: 0 });

    await expect(
      attachRoute.handler({
        ...handlerParams,
        params: {
          path: { id: 'event-1' },
          body: { ...attachInvestigationBody, trigger_feedback: triggerFeedback },
        },
        request: {
          authzResult: {
            [NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage]: true,
          },
        },
      } as never)
    ).resolves.toEqual({ updated: 1, ignored: 0 });
    expect(mockAttachInvestigationToEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        triggerFeedback,
      })
    );
  });

  it('attaches the run record without Detection Engine manage when trigger_feedback is absent', async () => {
    mockAttachInvestigationToEvent.mockResolvedValue({ updated: 1, ignored: 0 });

    await expect(attachRoute.handler(handlerParams as never)).resolves.toEqual({
      updated: 1,
      ignored: 0,
    });
    expect(mockAttachInvestigationToEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerFeedback: undefined,
      })
    );
  });
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
      server: { nightshiftInvestigations: {} },
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

  it('maps event_id to eventIds and still forwards time range and other filters', async () => {
    const findLatestByCurrentStatePaginated = jest.fn().mockResolvedValue({
      hits: [],
      page: 1,
      perPage: 25,
      total: 0,
    });

    await eventsSearchRoute.handler({
      params: {
        query: {
          event_id: 'event-1',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
          status: 'open',
          severity: '40-medium',
          stream: 'logs.test',
          search: 'noise',
          page: 2,
          perPage: 10,
        },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getEventClient: () => ({ findLatestByCurrentStatePaginated }),
      }),
      server: {},
    } as never);

    expect(findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      eventIds: ['event-1'],
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      status: ['open'],
      severity: ['40-medium'],
      stream: ['logs.test'],
      search: 'noise',
      page: 2,
      perPage: 10,
    });
  });
});

describe('GET /internal/significant_events/events/{id}/lifecycle', () => {
  it('returns lineage events with query-computed created_at', async () => {
    const createdAt = '2025-12-31T19:00:00.000Z';
    const firstVersion = {
      '@timestamp': '2026-01-01T00:00:00+05:00',
      created_at: createdAt,
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

    expect(response.events).toEqual([firstVersion, latestVersion]);
  });
});
