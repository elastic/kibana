/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { PackSavedObject } from '../../common/types';
import { updatePackRoute } from './update_pack_route';
import { updatePacksRequestBodySchema } from '../../../common/api/packs/update_packs_route';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

const mockFetchAllItems = (items: unknown[] = []) =>
  jest.fn().mockResolvedValue(
    (async function* () {
      yield items;
    })()
  );

const fetchAllItemsFromListMock = (listMock: jest.Mock) =>
  jest.fn().mockImplementation(async () => {
    const { items = [] } = await listMock();

    return (async function* () {
      yield items;
    })();
  });

const buildMockContext = () => ({
  core: Promise.resolve({
    elasticsearch: {
      client: {
        asCurrentUser: {},
      },
    },
    savedObjects: {
      client: {},
    },
  }),
});

describe('updatePackRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const basePackSO: {
    id: string;
    references: Array<{ id: string; name: string; type: string }>;
    attributes: Partial<PackSavedObject>;
  } = {
    id: 'pack-id',
    references: [],
    attributes: {
      name: 'my-pack',
      description: 'Test pack',
      queries: [],
      enabled: false,
      version: 1,
      shards: [],
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'admin',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'admin',
    },
  };

  const buildMockSavedObjectsClient = (
    currentSO: typeof basePackSO,
    updatedSOAttributes?: Partial<PackSavedObject>
  ) => ({
    get: jest.fn().mockResolvedValue(currentSO),
    find: jest.fn().mockResolvedValue({ saved_objects: [] }),
    update: jest.fn().mockResolvedValue({
      id: 'pack-id',
      attributes: { ...currentSO.attributes, ...updatedSOAttributes },
      references: [],
    }),
    list: jest.fn().mockResolvedValue({ items: [] }),
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      security: {},
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentPolicyService: jest.fn().mockReturnValue({
          getByIds: jest.fn().mockResolvedValue([]),
        }),
        getPackagePolicyService: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue({ items: [] }),
          fetchAllItems: mockFetchAllItems([]),
        }),
      },
    } as unknown as OsqueryAppContext;

    updatePackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('put', '/api/osquery/packs/{id}');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester', profile_uid: 'uid-1' });
  });

  describe('schedule_id preserve-guard', () => {
    const getWrittenQueries = (mockClient: ReturnType<typeof buildMockSavedObjectsClient>) =>
      mockClient.update.mock.calls[0][2].queries as Array<Record<string, unknown>>;

    it('preserves an existing schedule_id on a policy-only edit', async () => {
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [
            {
              id: 'q1',
              name: 'q1',
              query: 'SELECT 1',
              interval: 60,
              schedule_id: 'existing-sched-1',
              start_date: '2025-01-01T00:00:00.000Z',
            },
          ],
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute();

      // A policy-only edit: the body restates the queries (as the UI does)
      // without touching schedule_id, plus a policy_ids change.
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
          policy_ids: [],
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      const q1 = getWrittenQueries(mockClient).find((q) => q.id === 'q1')!;
      expect(q1.schedule_id).toBe('existing-sched-1');
    });

    it('legacy query without schedule_id gets one, and a second edit preserves it', async () => {
      const legacySO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [{ id: 'q1', name: 'q1', query: 'SELECT 1', interval: 60 }],
        },
      };
      const firstClient = buildMockSavedObjectsClient(legacySO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(firstClient);

      setupRoute();

      const firstRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { queries: { q1: { query: 'SELECT 1', interval: 60 } } },
      });
      const firstResponse = httpServerMock.createResponseFactory();
      await routeHandler(buildMockContext() as any, firstRequest, firstResponse);

      expect(firstResponse.badRequest).not.toHaveBeenCalled();
      const mintedQuery = getWrittenQueries(firstClient).find((q) => q.id === 'q1')!;
      const mintedScheduleId = mintedQuery.schedule_id as string;
      expect(mintedScheduleId).toEqual(expect.any(String));
      expect(mintedScheduleId.length).toBeGreaterThan(0);

      // Second edit: the SO now carries the minted schedule_id. A subsequent
      // save must preserve it byte-for-byte.
      const secondSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: getWrittenQueries(firstClient) as PackSavedObject['queries'],
        },
      };
      const secondClient = buildMockSavedObjectsClient(secondSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(secondClient);

      setupRoute();

      const secondRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { queries: { q1: { query: 'SELECT 1', interval: 60 } } },
      });
      const secondResponse = httpServerMock.createResponseFactory();
      await routeHandler(buildMockContext() as any, secondRequest, secondResponse);

      expect(secondResponse.badRequest).not.toHaveBeenCalled();
      const preservedQuery = getWrittenQueries(secondClient).find((q) => q.id === 'q1')!;
      expect(preservedQuery.schedule_id).toBe(mintedScheduleId);
    });

    it('preserves schedule_id across a query rename via the incoming `id`', async () => {
      // The stored query id is `old-name`. The edit renames it (new map key
      // `new-name`) but carries the original `id` in the payload so the guard
      // resolves the stored query and preserves its schedule_id instead of
      // minting a fresh one and severing the query's scheduled history.
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [
            {
              id: 'old-name',
              name: 'old-name',
              query: 'SELECT 1',
              interval: 60,
              schedule_id: 'sched-to-preserve',
              start_date: '2025-01-01T00:00:00.000Z',
            },
          ],
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          queries: {
            'new-name': { id: 'old-name', query: 'SELECT 1', interval: 60 },
          },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      const written = getWrittenQueries(mockClient);
      // The query is written under its new id (rebuilt from the map key)...
      const renamed = written.find((q) => q.id === 'new-name')!;
      expect(renamed).toBeDefined();
      // ...and the original schedule_id survives the rename.
      expect(renamed.schedule_id).toBe('sched-to-preserve');
      // No stale `id` from the payload is persisted onto the query value.
      expect(renamed.id).toBe('new-name');
    });

    it('route validation accepts a per-query `id` on the update body', () => {
      // The rename-preservation path above relies on the request body being
      // allowed to carry a per-query `id`. This pins that the real route
      // validation accepts it rather than 400ing.
      const validate = buildRouteValidation(updatePacksRequestBodySchema);
      const ok = jest.fn((value) => ({ value }));
      const badRequest = jest.fn((error) => ({ error }));

      validate({ queries: { 'new-name': { id: 'old-name', query: 'SELECT 1', interval: 60 } } }, {
        ok,
        badRequest,
      } as never);

      expect(badRequest).not.toHaveBeenCalled();
      expect(ok).toHaveBeenCalledTimes(1);
    });

    it('does not let two queries collide on one schedule_id when a stale `id` is reused', async () => {
      // A stale/duplicate client-supplied id must not make two queries
      // inherit the same stored schedule_id — each stored row is consumable once.
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [
            {
              id: 'q1',
              name: 'q1',
              query: 'SELECT 1',
              interval: 60,
              schedule_id: 'sid-q1',
              start_date: '2025-01-01T00:00:00.000Z',
            },
            {
              id: 'q2',
              name: 'q2',
              query: 'SELECT 2',
              interval: 60,
              schedule_id: 'sid-q2',
              start_date: '2025-01-01T00:00:00.000Z',
            },
          ],
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          queries: {
            q1: { id: 'q1', query: 'SELECT 1', interval: 60 },
            q2: { id: 'q1', query: 'SELECT 2', interval: 60 }, // <-- stale/wrong id
          },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      const written = getWrittenQueries(mockClient);
      const q1 = written.find((q) => q.id === 'q1')!;
      const q2 = written.find((q) => q.id === 'q2')!;
      expect(q1.schedule_id).toBe('sid-q1');
      expect(q2.schedule_id).not.toBe('sid-q1');
      expect(q1.schedule_id).not.toBe(q2.schedule_id);
    });

    it('honors an explicit rename `id` claim over another query`s own map key, regardless of order', async () => {
      // Explicit rename intent wins the stored row regardless of key order.
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [
            {
              id: 'q1',
              name: 'q1',
              query: 'SELECT 1',
              interval: 60,
              schedule_id: 'sid-q1',
              start_date: '2025-01-01T00:00:00.000Z',
            },
          ],
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          queries: {
            other: { id: 'q1', query: 'SELECT 2', interval: 60 }, // claims q1's id
            q1: { id: 'q1', query: 'SELECT 1', interval: 60 }, // also claims q1's id
          },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      const written = getWrittenQueries(mockClient);
      const q1 = written.find((q) => q.id === 'q1')!;
      const other = written.find((q) => q.id === 'other')!;
      // The first id-claimant (`other`) wins the stored row; `q1` mints fresh.
      expect(other.schedule_id).toBe('sid-q1');
      expect(q1.schedule_id).not.toBe('sid-q1');
    });

    it('rename plus name reuse does not misattribute schedule_id (regression)', async () => {
      // Rename must win over a new query reusing the freed map key.
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          queries: [
            {
              id: 'old-name',
              name: 'old-name',
              query: 'SELECT 1',
              interval: 60,
              schedule_id: 'sched-to-preserve',
              start_date: '2025-01-01T00:00:00.000Z',
            },
          ],
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO);
      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          queries: {
            'old-name': { query: 'SELECT 2', interval: 60 }, // new query reusing the freed name
            'new-name': { id: 'old-name', query: 'SELECT 1', interval: 60 }, // the rename
          },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      const written = getWrittenQueries(mockClient);
      const renamed = written.find((q) => q.id === 'new-name')!;
      const reused = written.find((q) => q.id === 'old-name')!;
      expect(renamed.schedule_id).toBe('sched-to-preserve');
      expect(reused.schedule_id).toEqual(expect.any(String));
      expect(reused.schedule_id).not.toBe(renamed.schedule_id);
    });
  });

  // A concurrent modification of the Fleet package policy surfaces as a Boom
  // 409 from packagePolicyService.update. The pack SO write already succeeded,
  // so the route must map that specific failure to `response.conflict` (retry
  // guidance) — and rethrow any OTHER failure so it isn't silently downgraded.
  describe('Fleet package-policy update failure handling', () => {
    // Reuses the enable-flip + policy_ids-omitted harness (the branch that
    // calls packagePolicyService.update), varying only the update rejection.
    const setupWithPackagePolicyUpdate = (packagePolicyUpdate: jest.Mock) => {
      const currentSO = {
        ...basePackSO,
        references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
        attributes: {
          ...basePackSO.attributes,
          enabled: false,
        },
      };
      const updatedSO = {
        ...currentSO,
        attributes: { ...currentSO.attributes, enabled: true },
      };

      let getCallCount = 0;
      const mockClient = {
        get: jest.fn().mockImplementation(() => {
          getCallCount += 1;

          return Promise.resolve(getCallCount === 1 ? currentSO : updatedSO);
        }),
        find: jest.fn().mockResolvedValue({ saved_objects: [] }),
        update: jest.fn().mockResolvedValue({
          id: 'pack-id',
          attributes: updatedSO.attributes,
          references: currentSO.references,
        }),
        list: jest.fn().mockResolvedValue({ items: [] }),
      };

      const packagePolicyList = jest.fn().mockResolvedValue({
        items: [
          {
            id: 'package-policy-1',
            policy_ids: ['policy-1'],
            package: { name: 'osquery_manager', version: '1.0.0' },
            inputs: [
              {
                type: 'osquery',
                streams: [],
                config: {
                  osquery: {
                    value: {
                      packs: {
                        'default--my-pack': {
                          shard: 100,
                          pack_id: 'pack-id',
                          queries: {},
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      });

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      const mockRouter = createMockRouter();
      mockOsqueryContext = {
        logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
        security: {},
        getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
          getAgentPolicyService: jest.fn().mockReturnValue({
            getByIds: jest.fn().mockResolvedValue([{ id: 'policy-1', name: 'policy-1' }]),
          }),
          getPackagePolicyService: jest.fn().mockReturnValue({
            list: packagePolicyList,
            fetchAllItems: fetchAllItemsFromListMock(packagePolicyList),
            update: packagePolicyUpdate,
          }),
        },
      } as unknown as OsqueryAppContext;

      updatePackRoute(mockRouter, mockOsqueryContext);
      const route = mockRouter.versioned.getRoute('put', '/api/osquery/packs/{id}');
      const routeVersion = route.versions[API_VERSIONS.public.v1];
      if (!routeVersion) throw new Error('no route version');
      routeHandler = routeVersion.handler;
    };

    it('maps a Boom 409 conflict from packagePolicyService.update to response.conflict', async () => {
      const packagePolicyUpdate = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('Conflict'), { output: { statusCode: 409 } }));
      setupWithPackagePolicyUpdate(packagePolicyUpdate);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { enabled: true },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      // The pack SO write already succeeded → surface a retryable conflict.
      expect(mockResponse.conflict).toHaveBeenCalledTimes(1);
      // Not swallowed into a 200 nor thrown as a 500.
      expect(mockResponse.ok).not.toHaveBeenCalled();
      const conflictArg = mockResponse.conflict.mock.calls[0][0] as { body: { message: string } };
      expect(conflictArg.body.message).toMatch(/modified concurrently|retry/i);
    });

    it('rethrows a generic (non-409) packagePolicyService.update failure — not downgraded', async () => {
      const packagePolicyUpdate = jest.fn().mockRejectedValue(new Error('boom-generic'));
      setupWithPackagePolicyUpdate(packagePolicyUpdate);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { enabled: true },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      // A non-conflict error must propagate out of the handler, not be mapped
      // to conflict or swallowed into a success response.
      await expect(
        routeHandler(buildMockContext() as any, mockRequest, mockResponse)
      ).rejects.toThrow('boom-generic');

      expect(mockResponse.conflict).not.toHaveBeenCalled();
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });
  });
});
