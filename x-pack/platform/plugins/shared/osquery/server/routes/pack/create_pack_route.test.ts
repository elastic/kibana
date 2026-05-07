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
import { createPackRoute } from './create_pack_route';
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

const buildSavedObjectsClient = (createOverrides: Record<string, unknown> = {}) => ({
  find: jest.fn().mockResolvedValue({ saved_objects: [] }),
  create: jest.fn().mockResolvedValue({
    id: 'new-pack-id',
    attributes: {
      name: 'pack-1',
      description: 'desc',
      queries: [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
      enabled: false,
      shards: [],
      created_at: '2025-06-01T00:00:00.000Z',
      created_by: 'tester',
      updated_at: '2025-06-01T00:00:00.000Z',
      updated_by: 'tester',
      ...createOverrides,
    },
  }),
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
  createPackRoute(router, osqueryContext);

  const route = router.versioned.getRoute('post', '/api/osquery/packs');
  const routeVersion = route.versions[API_VERSIONS.public.v1];
  if (!routeVersion) {
    throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found`);
  }

  return routeVersion.handler;
};

const buildContext = () =>
  ({
    core: {
      elasticsearch: { client: { asCurrentUser: {} } },
    },
  } as any);

describe('createPackRoute — Phase 4 RRULE scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });
  });

  it('with feature flag ON, persists pack-level RRULE schedule on the SO and surfaces it in the response', async () => {
    const client = buildSavedObjectsClient({
      schedule_type: 'rrule',
      rrule_schedule: validRrule,
    });
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'pack-1',
        description: 'desc',
        enabled: false,
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'rrule',
        rrule_schedule: validRrule,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    expect(response.ok).toHaveBeenCalled();
    const createArgs = client.create.mock.calls[0][1];
    expect(createArgs.schedule_type).toBe('rrule');
    expect(createArgs.rrule_schedule).toEqual(validRrule);
    expect(createArgs.interval).toBeUndefined();

    const body = response.ok.mock.calls[0][0]?.body as any;
    expect(body.data.schedule_type).toBe('rrule');
    expect(body.data.rrule_schedule).toEqual(validRrule);
    expect(body.data.interval).toBeUndefined();
  });

  it('with feature flag ON, persists pack-level interval schedule and discriminates the response', async () => {
    const client = buildSavedObjectsClient({ schedule_type: 'interval', interval: 1800 });
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'pack-1',
        enabled: false,
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'interval',
        interval: 1800,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const createArgs = client.create.mock.calls[0][1];
    expect(createArgs.schedule_type).toBe('interval');
    expect(createArgs.interval).toBe(1800);
    expect(createArgs.rrule_schedule).toBeUndefined();

    const body = response.ok.mock.calls[0][0]?.body as any;
    expect(body.data.schedule_type).toBe('interval');
    expect(body.data.interval).toBe(1800);
    expect(body.data.rrule_schedule).toBeUndefined();
  });

  it('with feature flag OFF, strips schedule fields from the SO write and from per-query payloads', async () => {
    const client = buildSavedObjectsClient();
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: false });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'pack-1',
        enabled: false,
        queries: {
          q1: {
            query: 'SELECT 1',
            interval: 60,
            schedule_type: 'rrule',
            rrule_schedule: validRrule,
          },
        },
        schedule_type: 'rrule',
        rrule_schedule: validRrule,
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    const createArgs = client.create.mock.calls[0][1];
    expect(createArgs.schedule_type).toBeUndefined();
    expect(createArgs.rrule_schedule).toBeUndefined();
    expect(createArgs.interval).toBeUndefined();
    expect(createArgs.queries[0]).toMatchObject({
      id: 'q1',
      query: 'SELECT 1',
      interval: 60,
    });
    expect(createArgs.queries[0]).not.toHaveProperty('schedule_type');
    expect(createArgs.queries[0]).not.toHaveProperty('rrule_schedule');
  });

  it('with feature flag ON, returns 400 when schedule input is invalid', async () => {
    const client = buildSavedObjectsClient();
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const osqueryContext = buildOsqueryContext({ rruleScheduling: true });
    const handler = setupRoute(osqueryContext);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'pack-1',
        enabled: false,
        queries: { q1: { query: 'SELECT 1', interval: 60 } },
        schedule_type: 'rrule',
        // missing rrule_schedule
      },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(buildContext(), request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(client.create).not.toHaveBeenCalled();
  });
});

describe('createPackRoute — Phase 7 Fleet config fan-out integration', () => {
  const buildPackagePolicy = (overrides: Record<string, unknown> = {}) => ({
    id: 'osquery-pp-1',
    policy_id: 'agent-policy-1',
    policy_ids: ['agent-policy-1'],
    package: { name: 'osquery_manager', version: '1.0.0' },
    inputs: [{ type: 'osquery', enabled: true, streams: [] }],
    ...overrides,
  });

  const setupRouteWithFleet = (
    bodyOverrides: Record<string, unknown>,
    {
      experimentalFeatures = { rruleScheduling: true },
      packSavedObjectAttributes = {},
    }: {
      experimentalFeatures?: Partial<ExperimentalFeatures>;
      packSavedObjectAttributes?: Record<string, unknown>;
    } = {}
  ) => {
    const client = {
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'pack-so-id',
        attributes: {
          name: 'pack-fleet',
          description: 'desc',
          queries: bodyOverrides.queries ?? {},
          enabled: true,
          shards: [],
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
          ...packSavedObjectAttributes,
        },
      }),
    };
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(client);

    const packagePolicy = buildPackagePolicy();
    const updateMock = jest.fn();

    const osqueryContext = {
      logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
      experimentalFeatures: { ...allowedExperimentalValues, ...experimentalFeatures },
      security: {},
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentPolicyService: jest.fn().mockReturnValue({
          getByIds: jest
            .fn()
            .mockResolvedValue([{ id: 'agent-policy-1', name: 'Agent Policy 1', agents: 0 }]),
        }),
        getPackagePolicyService: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue({ items: [packagePolicy] }),
          update: updateMock,
        }),
      },
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
    } as unknown as OsqueryAppContext;

    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    const handler = setupRoute(osqueryContext);
    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'pack-fleet',
        description: 'desc',
        enabled: true,
        policy_ids: ['agent-policy-1'],
        ...bodyOverrides,
      },
    });
    const response = httpServerMock.createResponseFactory();

    return { handler, request, response, updateMock, client };
  };

  /**
   * Pull the full pack entry the route writes to
   * `inputs[0].config.osquery.value.packs.<spaceId>--<packName>`. After D13
   * the entry exposes `default_native_schedule` / `default_rrule_schedule` /
   * `default_space_id` at the pack level alongside the per-query map.
   */
  const getFleetPackEntryFromUpdateCall = (updateMock: jest.Mock) => {
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatedPolicy = updateMock.mock.calls[0][3];
    const packKey = 'default--pack-fleet';
    const packEntry = updatedPolicy.inputs?.[0]?.config?.osquery?.value?.packs?.[packKey];
    expect(packEntry).toBeDefined();

    return packEntry as {
      pack_id: string;
      shard?: number;
      default_native_schedule?: { interval: number; start_date?: string };
      default_rrule_schedule?: Record<string, unknown>;
      default_space_id?: string;
      queries: Record<string, Record<string, unknown>>;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pack with pack-level RRULE: emits default_rrule_schedule, queries inherit by omission (D13)', async () => {
    const packRrule = {
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    const { handler, request, response, updateMock } = setupRouteWithFleet(
      {
        queries: {
          q1: { query: 'SELECT 1', interval: 3600 },
          q2: { query: 'SELECT 2', interval: 7200 },
        },
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      },
      { packSavedObjectAttributes: { schedule_type: 'rrule', rrule_schedule: packRrule } }
    );

    await handler(buildContext(), request, response);

    expect(response.ok).toHaveBeenCalled();
    const packEntry = getFleetPackEntryFromUpdateCall(updateMock);

    expect(packEntry.default_rrule_schedule).toEqual(packRrule);
    expect(packEntry).not.toHaveProperty('default_native_schedule');
    expect(packEntry.default_space_id).toBe('default');

    expect(packEntry.queries.q1).toMatchObject({ query: 'SELECT 1' });
    expect(packEntry.queries.q1).not.toHaveProperty('rrule_schedule');
    expect(packEntry.queries.q1).not.toHaveProperty('interval');
    expect(packEntry.queries.q1).not.toHaveProperty('space_id');
    expect(packEntry.queries.q1).not.toHaveProperty('schedule_type');
    expect(packEntry.queries.q2).toMatchObject({ query: 'SELECT 2' });
    expect(packEntry.queries.q2).not.toHaveProperty('rrule_schedule');
  });

  it('creates a pack with pack-level interval: emits default_native_schedule (D13)', async () => {
    const { handler, request, response, updateMock } = setupRouteWithFleet(
      {
        queries: {
          q1: { query: 'SELECT 1', interval: 3600 },
          q2: { query: 'SELECT 2', interval: 7200 },
        },
        schedule_type: 'interval',
        interval: 1800,
      },
      { packSavedObjectAttributes: { schedule_type: 'interval', interval: 1800 } }
    );

    await handler(buildContext(), request, response);

    expect(response.ok).toHaveBeenCalled();
    const packEntry = getFleetPackEntryFromUpdateCall(updateMock);

    expect(packEntry.default_native_schedule).toEqual({ interval: 1800 });
    expect(packEntry).not.toHaveProperty('default_rrule_schedule');

    expect(packEntry.queries.q1).toMatchObject({ query: 'SELECT 1' });
    expect(packEntry.queries.q1).not.toHaveProperty('interval');
    expect(packEntry.queries.q1).not.toHaveProperty('rrule_schedule');
  });

  it('mixed: pack RRULE default + one per-query interval override is rejected (D11 same-mode)', async () => {
    const packRrule = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };

    const { handler, request, response } = setupRouteWithFleet(
      {
        queries: {
          inherits: { query: 'SELECT 1', interval: 3600 },
          override: {
            query: 'SELECT 2',
            interval: 300,
            schedule_type: 'interval',
          },
        },
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      },
      { packSavedObjectAttributes: { schedule_type: 'rrule', rrule_schedule: packRrule } }
    );

    await handler(buildContext(), request, response);

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('pack RRULE default + per-query rrule override emits both: default at pack, override on the query (D13)', async () => {
    const packRrule = {
      rrule: 'FREQ=DAILY',
      start_date: '2024-01-01T00:00:00.000Z',
    };
    const queryRrule = {
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      start_date: '2024-02-01T00:00:00.000Z',
    };

    const { handler, request, response, updateMock } = setupRouteWithFleet(
      {
        queries: {
          inherits: { query: 'SELECT 1' },
          override: {
            query: 'SELECT 2',
            schedule_type: 'rrule',
            rrule_schedule: queryRrule,
          },
        },
        schedule_type: 'rrule',
        rrule_schedule: packRrule,
      },
      { packSavedObjectAttributes: { schedule_type: 'rrule', rrule_schedule: packRrule } }
    );

    await handler(buildContext(), request, response);

    expect(response.ok).toHaveBeenCalled();
    const packEntry = getFleetPackEntryFromUpdateCall(updateMock);

    expect(packEntry.default_rrule_schedule).toEqual(packRrule);
    expect(packEntry.queries.inherits).not.toHaveProperty('rrule_schedule');
    expect(packEntry.queries.override.rrule_schedule).toEqual(queryRrule);
    expect(packEntry.queries.override).not.toHaveProperty('schedule_type');
  });
});
