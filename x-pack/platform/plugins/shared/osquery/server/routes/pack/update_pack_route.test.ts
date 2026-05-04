/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import type { ExperimentalFeatures } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { updatePackRoute } from './update_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

const validRrule = {
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  start_date: '2024-01-01T00:00:00.000Z',
};

const baseExistingPack = {
  id: 'pack-1',
  attributes: {
    name: 'pack-1',
    description: 'desc',
    queries: [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
    // `enabled: true` keeps the route on the full response path; an existing
    // `false`+omitted body `enabled` triggers the raw-SO early-return branch
    // covered by other tests.
    enabled: true,
    shards: [],
    created_at: '2025-01-01T00:00:00.000Z',
    created_by: 'tester',
    updated_at: '2025-01-01T00:00:00.000Z',
    updated_by: 'tester',
  },
  references: [],
};

const buildSavedObjectsClient = (
  existingAttributes: Record<string, unknown>,
  postUpdateAttributes: Record<string, unknown>
) => ({
  get: jest
    .fn()
    .mockResolvedValueOnce({
      ...baseExistingPack,
      attributes: { ...baseExistingPack.attributes, ...existingAttributes },
    })
    .mockResolvedValue({
      ...baseExistingPack,
      attributes: { ...baseExistingPack.attributes, ...postUpdateAttributes },
    }),
  find: jest.fn().mockResolvedValue({ saved_objects: [] }),
  update: jest.fn().mockResolvedValue({}),
});

const buildOsqueryContext = (
  experimentalFeatures: Partial<ExperimentalFeatures> = {}
): OsqueryAppContext =>
  ({
    logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
    experimentalFeatures: { ...allowedExperimentalValues, ...experimentalFeatures },
    security: {},
    service: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      getAgentPolicyService: jest.fn().mockReturnValue({
        getByIds: jest.fn().mockResolvedValue([]),
      }),
      getPackagePolicyService: jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue({ items: [] }),
        update: jest.fn(),
      }),
    },
    getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
  } as unknown as OsqueryAppContext);

const setupRoute = (osqueryContext: OsqueryAppContext): RequestHandler => {
  const httpService = httpServiceMock.createSetupContract();
  const router = httpService.createRouter();
  updatePackRoute(router, osqueryContext);
  const route = router.versioned.getRoute('put', '/api/osquery/packs/{id}');
  const routeVersion = route.versions[API_VERSIONS.public.v1];
  if (!routeVersion) {
    throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found`);
  }

  return routeVersion.handler;
};

const buildContext = () => ({ core: { elasticsearch: { client: { asCurrentUser: {} } } } } as any);

describe('updatePackRoute — Phase 4 RRULE scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });
  });

  it('with feature flag ON, transitions an interval pack to RRULE and writes new schedule fields', async () => {
    const client = buildSavedObjectsClient(
      { schedule_type: 'interval', interval: 1800 },
      // post-update attrs reflect the merged state including the stale `interval`
      { schedule_type: 'rrule', interval: 1800, rrule_schedule: validRrule }
    );
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'pack-1' },
      body: {
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'rrule',
        rrule_schedule: validRrule,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const updateArgs = client.update.mock.calls[0][2];
    expect(updateArgs.schedule_type).toBe('rrule');
    expect(updateArgs.rrule_schedule).toEqual(validRrule);
    expect(updateArgs.interval).toBeUndefined();

    // Response is discriminated by `schedule_type`, so the stale `interval` left
    // on the SO is intentionally not surfaced to clients.
    const body = response.ok.mock.calls[0][0]?.body as any;
    expect(body.data.schedule_type).toBe('rrule');
    expect(body.data.rrule_schedule).toEqual(validRrule);
    expect(body.data.interval).toBeUndefined();
  });

  it('with feature flag ON, transitions an RRULE pack back to interval and writes new schedule fields', async () => {
    const client = buildSavedObjectsClient(
      { schedule_type: 'rrule', rrule_schedule: validRrule },
      { schedule_type: 'interval', interval: 900, rrule_schedule: validRrule }
    );
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'pack-1' },
      body: {
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'interval',
        interval: 900,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const updateArgs = client.update.mock.calls[0][2];
    expect(updateArgs.schedule_type).toBe('interval');
    expect(updateArgs.interval).toBe(900);
    expect(updateArgs.rrule_schedule).toBeUndefined();

    const body = response.ok.mock.calls[0][0]?.body as any;
    expect(body.data.schedule_type).toBe('interval');
    expect(body.data.interval).toBe(900);
    expect(body.data.rrule_schedule).toBeUndefined();
  });

  it('with feature flag OFF, strips schedule fields from the partial update', async () => {
    const client = buildSavedObjectsClient({}, {});
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: false });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'pack-1' },
      body: {
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'rrule',
        rrule_schedule: validRrule,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const updateArgs = client.update.mock.calls[0][2];
    expect(updateArgs.schedule_type).toBeUndefined();
    expect(updateArgs.rrule_schedule).toBeUndefined();
    expect(updateArgs.interval).toBeUndefined();
  });

  it('with feature flag ON, returns 400 when schedule input is invalid', async () => {
    const client = buildSavedObjectsClient({}, {});
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'pack-1' },
      body: {
        schedule_type: 'rrule',
        interval: 3600,
        rrule_schedule: validRrule,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
  });

  it('preserves schedule fields when the body omits them (no-op partial update)', async () => {
    const client = buildSavedObjectsClient(
      { schedule_type: 'rrule', rrule_schedule: validRrule },
      { schedule_type: 'rrule', rrule_schedule: validRrule, name: 'renamed' }
    );
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'pack-1' },
      body: { name: 'renamed' },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const updateArgs = client.update.mock.calls[0][2];
    // Body omitted schedule fields → partial update should not write any.
    expect(updateArgs.schedule_type).toBeUndefined();
    expect(updateArgs.rrule_schedule).toBeUndefined();
    expect(updateArgs.interval).toBeUndefined();

    const body = response.ok.mock.calls[0][0]?.body as any;
    expect(body.data.schedule_type).toBe('rrule');
    expect(body.data.rrule_schedule).toEqual(validRrule);
  });
});
