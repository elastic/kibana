/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { findPackRoute } from './find_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('findPackRoute', () => {
  let routeHandler: RequestHandler;
  const fetchAllItems = jest.fn();
  const getByIds = jest.fn();
  const logger = loggingSystemMock.createLogger();
  const integration = (owners = ['A', 'B', 'C']) => ({
    id: 'shared',
    policy_ids: owners,
    inputs: [{ config: { osquery: { value: { packs: { 'custom--test-pack': {} } } } } }],
  });
  let mockOsqueryContext: OsqueryAppContext;
  let mockSavedObjectsClient: { find: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makePack = (overrides: Record<string, unknown> = {}) => ({
    id: 'pack-1',
    attributes: {
      name: 'test-pack',
      description: 'A test pack',
      queries: {},
      version: 1,
      enabled: true,
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'elastic',
      created_by_profile_uid: 'uid-1',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'elastic',
      updated_by_profile_uid: 'uid-1',
      ...overrides,
    },
    references: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchAllItems.mockImplementation(async function* () {
      yield [integration()];
    });
    getByIds.mockImplementation(async (_client, ids: string[], options) => {
      if (ids.includes('missing') && !options?.ignoreMissing) {
        throw new Error('AgentPolicyNotFoundError');
      }

      return ids.filter((id) => id !== 'missing').map((id) => ({ id }));
    });
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(logger),
      },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'custom' }),
        getPackagePolicyService: () => ({ fetchAllItems }),
        getAgentPolicyService: () => ({ getByIds }),
      },
      experimentalFeatures: { rruleScheduling: false },
    } as unknown as OsqueryAppContext;

    mockSavedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    findPackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/packs');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns packs with profile_uid fields in response', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makePack()],
      total: 1,
      page: 1,
      per_page: 20,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.data[0].created_by_profile_uid).toBe('uid-1');
    expect(body.data[0].updated_by_profile_uid).toBe('uid-1');
  });

  it('passes search and searchFields to SO client when search param provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { search: 'monitoring' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBe('monitoring');
    expect(findArgs.searchFields).toEqual(['name', 'description']);
  });

  it('does not pass search or searchFields when search param is absent', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBeUndefined();
    expect(findArgs.searchFields).toBeUndefined();
  });

  it('builds enabled filter when enabled param is "true"', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'true' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: true');
  });

  it('builds enabled filter when enabled param is "false"', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'false' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: false');
  });

  it('builds createdBy filter for a single user', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.created_by: "elastic"');
  });

  it('builds createdBy filter with OR for multiple comma-separated users', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { createdBy: 'elastic,admin' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain(
      '(osquery-pack.attributes.created_by: "elastic" OR osquery-pack.attributes.created_by: "admin")'
    );
  });

  it('combines enabled and createdBy filters with AND', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'true', createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: true');
    expect(findArgs.filter).toContain('osquery-pack.attributes.created_by: "elastic"');
    expect(findArgs.filter).toContain(' AND ');
  });

  it('uses default pagination when no page/pageSize provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.page).toBe(1);
    expect(findArgs.perPage).toBe(20);
    expect(findArgs.sortField).toBe('updated_at');
    expect(findArgs.sortOrder).toBe('desc');
  });

  it('passes custom pagination and sort params', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { page: 2, pageSize: 10, sort: 'created_at', sortOrder: 'asc' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.page).toBe(2);
    expect(findArgs.perPage).toBe(10);
    expect(findArgs.sortField).toBe('created_at');
    expect(findArgs.sortOrder).toBe('asc');
  });

  it('marks prebuilt packs as read_only', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          ...makePack(),
          references: [{ type: 'osquery-pack-asset', id: 'asset-1', name: 'test-pack' }],
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.data[0].read_only).toBe(true);
  });

  it('marks user-created packs as not read_only', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makePack({ version: undefined })],
      total: 1,
      page: 1,
      per_page: 20,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.data[0].read_only).toBe(false);
  });

  it('does not pass filter when no filter params provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toBeUndefined();
  });

  describe('flag-off response contract', () => {
    it('flag off + interval-mode SO: response omits schedule_type and pack-level interval', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [makePack({ schedule_type: 'interval', interval: 60 })],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as any;
      expect(body.data[0]).not.toHaveProperty('schedule_type');
      expect(body.data[0]).not.toHaveProperty('interval');
    });

    it('flag off + rrule-mode SO: response omits schedule_type and rrule_schedule', async () => {
      const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [makePack({ schedule_type: 'rrule', rrule_schedule: rruleValue })],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as any;
      expect(body.data[0]).not.toHaveProperty('schedule_type');
      expect(body.data[0]).not.toHaveProperty('rrule_schedule');
    });

    it('flag off + per-query rrule on SO: response queries do not include schedule_type or rrule_schedule', async () => {
      const rruleValue = { rrule: 'FREQ=HOURLY', start_date: '2026-01-01T00:00:00Z' };
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          makePack({
            queries: [
              {
                id: 'q1',
                name: 'q1',
                query: 'SELECT 1',
                schedule_type: 'rrule',
                rrule_schedule: rruleValue,
                interval: 60,
              },
            ],
          }),
        ],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as any;
      const responseQuery = body.data[0].queries[0];
      expect(responseQuery).not.toHaveProperty('schedule_type');
      expect(responseQuery).not.toHaveProperty('rrule_schedule');
      // Per-query interval (legacy field) MUST still surface.
      expect(responseQuery.interval).toBe(60);
    });

    it('flag on + interval-mode SO: response surfaces schedule_type and pack-level interval', async () => {
      mockOsqueryContext = {
        ...mockOsqueryContext,
        experimentalFeatures: { rruleScheduling: true },
      } as unknown as OsqueryAppContext;
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [makePack({ schedule_type: 'interval', interval: 60 })],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as any;
      expect(body.data[0].schedule_type).toBe('interval');
      expect(body.data[0].interval).toBe(60);
    });
  });

  describe('V5: pack-level execution defaults', () => {
    it('returns min_osquery_version, result_type, and platform when set', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          makePack({
            min_osquery_version: '5.10.0',
            result_type: 'differential',
            platform: 'linux',
          }),
        ],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as {
        data: Array<Record<string, unknown>>;
      };
      expect(body.data[0].min_osquery_version).toBe('5.10.0');
      expect(body.data[0].result_type).toBe('differential');
      expect(body.data[0].platform).toBe('linux');
    });

    it('omits V5 fields when they are not set', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [makePack()],
        total: 1,
        page: 1,
        per_page: 20,
      });

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      const body = mockResponse.ok.mock.calls[0][0]?.body as {
        data: Array<Record<string, unknown>>;
      };
      expect(body.data[0]).not.toHaveProperty('min_osquery_version');
      expect(body.data[0]).not.toHaveProperty('result_type');
      expect(body.data[0]).not.toHaveProperty('platform');
    });
  });

  describe('effective policy ids', () => {
    const readEffective = async (overrides: Record<string, boolean> = {}) => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            ...makePack(overrides),
            references: [{ type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, id: 'A', name: 'A' }],
          },
          { ...makePack({ name: 'second' }), id: 'pack-2' },
          { ...makePack({ name: 'third' }), id: 'pack-3' },
        ],
        total: 3,
        page: 1,
        per_page: 20,
      });
      setupRoute();
      const response = httpServerMock.createResponseFactory();
      await routeHandler(
        {} as Parameters<RequestHandler>[0],
        httpServerMock.createKibanaRequest({ query: { withEffectivePolicyIds: 'true' } }),
        response
      );
      expect(response.ok).toHaveBeenCalledTimes(1);
      const body = response.ok.mock.calls[0][0]?.body as {
        data: Array<Record<string, unknown>>;
      };

      for (const pack of body.data.slice(1)) {
        if ('effective_policy_ids' in body.data[0]) {
          expect(pack).toHaveProperty('effective_policy_ids', []);
        } else {
          expect(pack).not.toHaveProperty('effective_policy_ids');
        }
      }

      return body.data[0];
    };

    it('returns all shared integration owners from the active space', async () => {
      const pack = await readEffective();
      expect(pack).toHaveProperty('policy_ids', ['A']);
      expect(pack).toHaveProperty('effective_policy_ids', ['A', 'B', 'C']);
      expect(fetchAllItems).toHaveBeenCalledTimes(1);
      expect(fetchAllItems).toHaveBeenCalledWith(mockSavedObjectsClient, {
        kuery: expect.any(String),
        fields: ['name', 'enabled', 'policy_ids', 'inputs'],
      });
      expect(getByIds).toHaveBeenCalledWith(mockSavedObjectsClient, ['A', 'B', 'C'], {
        ignoreMissing: true,
        fields: ['name'],
      });
    });

    it('includes drift owner E and omits owners missing from the space', async () => {
      fetchAllItems.mockImplementation(async function* () {
        yield [integration(['A', 'B', 'C', 'E', 'missing'])];
      });
      expect(await readEffective()).toHaveProperty('effective_policy_ids', ['A', 'B', 'C', 'E']);
    });

    it('returns an empty array for a disabled pack without a wire block', async () => {
      fetchAllItems.mockImplementation(async function* () {
        yield [];
      });
      expect(await readEffective({ enabled: false })).toHaveProperty('effective_policy_ids', []);
    });

    it('omits effective targets and warns when the package-policy drain rejects', async () => {
      fetchAllItems.mockRejectedValue(new Error('Fleet unavailable'));
      expect(await readEffective()).not.toHaveProperty('effective_policy_ids');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('effective'));
    });

    it('omits effective targets and warns when the scoped owner lookup rejects', async () => {
      getByIds.mockRejectedValueOnce(new Error('Fleet unavailable'));
      expect(await readEffective()).not.toHaveProperty('effective_policy_ids');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('effective'));
    });

    it('skips the Fleet scan and omits the field unless the request opts in', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [makePack()],
        total: 1,
        page: 1,
        per_page: 20,
      });
      setupRoute();
      const response = httpServerMock.createResponseFactory();
      await routeHandler(
        {} as Parameters<RequestHandler>[0],
        httpServerMock.createKibanaRequest({ query: {} }),
        response
      );
      expect(response.ok).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(response.ok.mock.calls[0][0]?.body)).not.toContain(
        'effective_policy_ids'
      );
      expect(fetchAllItems).not.toHaveBeenCalled();
      expect(getByIds).not.toHaveBeenCalled();
    });
  });
});
