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
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

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

  const basePackSO: { id: string; references: []; attributes: Partial<PackSavedObject> } = {
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

  const setupRoute = (isRruleFeatureEnabled = true) => {
    const mockRouter = createMockRouter();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      security: {},
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
      experimentalFeatures: { rruleScheduling: isRruleFeatureEnabled },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentPolicyService: jest.fn().mockReturnValue({
          getByIds: jest.fn().mockResolvedValue([]),
        }),
        getPackagePolicyService: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue({ items: [] }),
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

  describe('schedule_type transition', () => {
    it('B11 — interval → rrule: returns 200, writes rrule_schedule and nulls interval on SO', async () => {
      const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: 'interval' as const,
          interval: 60,
          rrule_schedule: null,
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO, {
        schedule_type: 'rrule',
        interval: null,
        rrule_schedule: rruleValue,
      });

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          name: 'my-pack',
          schedule_type: 'rrule',
          rrule_schedule: rruleValue,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes.schedule_type).toBe('rrule');
      expect(patchedAttributes.interval).toBeNull();
      expect(patchedAttributes.rrule_schedule).toEqual(rruleValue);
    });

    it('B12 — rrule → interval: returns 200, writes interval and nulls rrule_schedule on SO', async () => {
      const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: 'rrule' as const,
          interval: null,
          rrule_schedule: rruleValue,
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO, {
        schedule_type: 'interval',
        interval: 120,
        rrule_schedule: null,
      });

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          name: 'my-pack',
          schedule_type: 'interval',
          interval: 120,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes.schedule_type).toBe('interval');
      expect(patchedAttributes.interval).toBe(120);
      expect(patchedAttributes.rrule_schedule).toBeNull();
    });

    it('schedule_type: null — full mode clear: both interval and rrule_schedule are null on SO patch', async () => {
      const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: 'rrule' as const,
          interval: null,
          rrule_schedule: rruleValue,
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO, {
        schedule_type: null,
        interval: null,
        rrule_schedule: null,
      });

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          name: 'my-pack',
          schedule_type: null,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes.schedule_type).toBeNull();
      expect(patchedAttributes.interval).toBeNull();
      expect(patchedAttributes.rrule_schedule).toBeNull();
    });

    it('no schedule fields in body (only name) — no schedule keys on SO patch', async () => {
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: 'interval' as const,
          interval: 60,
          rrule_schedule: null,
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO, {});

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { name: 'my-pack-renamed' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes).not.toHaveProperty('schedule_type');
      expect(patchedAttributes).not.toHaveProperty('interval');
      expect(patchedAttributes).not.toHaveProperty('rrule_schedule');
    });

    it('same-mode interval change — SO patch carries only interval, no schedule_type or rrule_schedule', async () => {
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: 'interval' as const,
          interval: 60,
          rrule_schedule: null,
        },
      };
      const mockClient = buildMockSavedObjectsClient(currentSO, { interval: 120 });

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: { name: 'my-pack', interval: 120 },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes).not.toHaveProperty('schedule_type');
      expect(patchedAttributes.interval).toBe(120);
      expect(patchedAttributes).not.toHaveProperty('rrule_schedule');
    });

    it('policy_ids omitted — preserves existing policy attachments (no strip)', async () => {
      // Reproduces the D14-adjacent bug: when a PUT updates schedule fields
      // without restating `policy_ids`, the pack must remain attached to its
      // current policies. Previously, missing `policy_ids` was interpreted as
      // "intersect with empty set" by getInitialPolicies, which then drove
      // the pack out of every Fleet package policy block.
      const currentSO = {
        ...basePackSO,
        references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
        attributes: {
          ...basePackSO.attributes,
          enabled: true,
          schedule_type: 'interval' as const,
          interval: 60,
          rrule_schedule: null,
        },
      } as typeof basePackSO;
      const rruleValue = { rrule: 'FREQ=MINUTELY;INTERVAL=2', start_date: '2026-05-22T14:00:00Z' };
      const updatedSO = {
        ...currentSO,
        attributes: {
          ...currentSO.attributes,
          schedule_type: 'rrule' as const,
          interval: null,
          rrule_schedule: rruleValue,
        },
      } as typeof basePackSO;
      // Two-stage get: route reads current SO first, then re-reads the
      // updated SO after writing. Mirror that here.
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

      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
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
                          default_native_schedule: { interval: 60 },
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
        experimentalFeatures: { rruleScheduling: true },
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
          getAgentPolicyService: jest.fn().mockReturnValue({
            getByIds: jest.fn().mockResolvedValue([{ id: 'policy-1', name: 'policy-1' }]),
          }),
          getPackagePolicyService: jest.fn().mockReturnValue({
            list: packagePolicyList,
            update: packagePolicyUpdate,
          }),
        },
      } as unknown as OsqueryAppContext;

      updatePackRoute(mockRouter, mockOsqueryContext);
      const route = mockRouter.versioned.getRoute('put', '/api/osquery/packs/{id}');
      const routeVersion = route.versions[API_VERSIONS.public.v1];
      if (!routeVersion) throw new Error('no route version');
      routeHandler = routeVersion.handler;

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          // `policy_ids` deliberately omitted — must not strip the pack.
          schedule_type: 'rrule',
          rrule_schedule: rruleValue,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);

      const [, , packagePolicyId, updatedPackagePolicy] = packagePolicyUpdate.mock.calls[0];
      expect(packagePolicyId).toBe('package-policy-1');

      const writtenPacks = updatedPackagePolicy.inputs[0].config.osquery.value.packs;
      expect(writtenPacks).toHaveProperty('default--my-pack');
      const writtenPack = writtenPacks['default--my-pack'];
      // Mode flipped on the wire: no stale native schedule, rrule slot present.
      expect(writtenPack.default_native_schedule).toBeUndefined();
      expect(writtenPack.default_rrule_schedule).toEqual(rruleValue);
    });

    it('feature flag off — RRULE body fields stripped, pack without pack-level schedule passes validation', async () => {
      const currentSO = {
        ...basePackSO,
        attributes: {
          ...basePackSO.attributes,
          schedule_type: undefined,
          interval: undefined,
          rrule_schedule: undefined,
        },
      };
      const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
      const mockClient = buildMockSavedObjectsClient(currentSO, {});

      (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);

      setupRoute(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'pack-id' },
        body: {
          name: 'my-pack',
          schedule_type: 'rrule',
          rrule_schedule: rruleValue,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();

      const updateCall = mockClient.update.mock.calls[0];
      const patchedAttributes = updateCall[2];
      expect(patchedAttributes).not.toHaveProperty('schedule_type');
      expect(patchedAttributes).not.toHaveProperty('rrule_schedule');
    });
  });
});
