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
import { readPackRoute } from './read_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('readPackRoute', () => {
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
  let mockSavedObjectsClient: { get: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makePack = (overrides: Record<string, unknown> = {}) => ({
    id: 'pack-1',
    type: 'osquery-pack',
    namespaces: ['default'],
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
      get: jest.fn().mockResolvedValue(makePack()),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    readPackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/packs/{id}');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  describe('read path: stored queries with legacy version strings pass through unchanged', () => {
    it('returns a stored query with version: "latest" without modification', async () => {
      mockSavedObjectsClient.get.mockResolvedValue(
        makePack({
          queries: {
            q1: { query: 'SELECT 1', version: 'latest', interval: 3600, snapshot: true },
          },
        })
      );

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const body = mockResponse.ok.mock.calls[0][0]?.body as { data: Record<string, unknown> };
      const queries = body.data.queries as Record<string, Record<string, unknown>>;
      expect(queries.q1.version).toBe('latest');
    });
  });

  describe('V5: pack-level execution defaults', () => {
    it('returns min_osquery_version, result_type, and platform when set', async () => {
      mockSavedObjectsClient.get.mockResolvedValue(
        makePack({
          min_osquery_version: '5.10.0',
          result_type: 'differential',
          platform: 'linux',
        })
      );

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const body = mockResponse.ok.mock.calls[0][0]?.body as { data: Record<string, unknown> };
      expect(body.data.min_osquery_version).toBe('5.10.0');
      expect(body.data.result_type).toBe('differential');
      expect(body.data.platform).toBe('linux');
    });

    it('omits V5 fields when they are not set', async () => {
      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const body = mockResponse.ok.mock.calls[0][0]?.body as { data: Record<string, unknown> };
      expect(body.data).not.toHaveProperty('min_osquery_version');
      expect(body.data).not.toHaveProperty('result_type');
      expect(body.data).not.toHaveProperty('platform');
    });
  });

  describe('effective policy ids', () => {
    const readEffective = async (overrides: Record<string, boolean> = {}) => {
      mockSavedObjectsClient.get.mockResolvedValue({
        ...makePack(overrides),
        references: [{ type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, id: 'A', name: 'A' }],
      });
      setupRoute();
      const response = httpServerMock.createResponseFactory();
      await routeHandler(
        {} as Parameters<RequestHandler>[0],
        httpServerMock.createKibanaRequest({
          params: { id: 'pack-1' },
          query: { withEffectivePolicyIds: 'true' },
        }),
        response
      );
      expect(response.ok).toHaveBeenCalledTimes(1);
      const body = response.ok.mock.calls[0][0]?.body as {
        data: Record<string, unknown>;
      };

      return body.data;
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
      mockSavedObjectsClient.get.mockResolvedValue(makePack());
      setupRoute();
      const response = httpServerMock.createResponseFactory();
      await routeHandler(
        {} as Parameters<RequestHandler>[0],
        httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } }),
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
