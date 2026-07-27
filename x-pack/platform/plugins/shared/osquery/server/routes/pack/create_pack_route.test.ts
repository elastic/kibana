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
import { createPackRoute } from './create_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

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

const osqueryPackagePolicy = (overrides: Record<string, unknown>) => ({
  id: 'package-policy-placeholder',
  policy_ids: [] as string[],
  package: { name: 'osquery_manager', version: '1.0.0' },
  inputs: [
    {
      type: 'osquery',
      streams: [],
      config: { osquery: { value: { packs: {} } } },
    },
  ],
  ...overrides,
});

describe('createPackRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const setupRoute = ({
    agentPolicies,
    packagePolicies,
    packagePolicyUpdate,
  }: {
    agentPolicies: Array<{ id: string; name: string }>;
    packagePolicies: Array<Record<string, unknown>>;
    packagePolicyUpdate: jest.Mock;
  }) => {
    const mockClient = {
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockImplementation((_type, attributes, options) =>
        Promise.resolve({
          id: 'pack-id',
          attributes,
          references: options?.references ?? [],
        })
      ),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(mockClient);
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester', profile_uid: 'uid-1' });

    const packagePolicyList = jest.fn().mockResolvedValue({ items: packagePolicies });

    const mockRouter = createMockRouter();
    mockOsqueryContext = {
      logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
      security: {},
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
      experimentalFeatures: { rruleScheduling: true },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentPolicyService: jest.fn().mockReturnValue({
          getByIds: jest.fn().mockResolvedValue(agentPolicies),
        }),
        getPackagePolicyService: jest.fn().mockReturnValue({
          list: packagePolicyList,
          fetchAllItems: fetchAllItemsFromListMock(packagePolicyList),
          update: packagePolicyUpdate,
        }),
      },
    } as unknown as OsqueryAppContext;

    createPackRoute(mockRouter, mockOsqueryContext);
    const route = mockRouter.versioned.getRoute('post', '/api/osquery/packs');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;

    return { mockClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fleet package-policy write dedup', () => {
    it('a package policy shared by two agent policies is written exactly once', async () => {
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      setupRoute({
        agentPolicies: [
          { id: 'agent-policy-a', name: 'agent-policy-a' },
          { id: 'agent-policy-b', name: 'agent-policy-b' },
        ],
        packagePolicies: [
          osqueryPackagePolicy({
            id: 'shared-package-policy',
            // Both agent policies resolve to this one Fleet package policy.
            policy_ids: ['agent-policy-a', 'agent-policy-b'],
          }),
        ],
        packagePolicyUpdate,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'my-pack',
          enabled: true,
          policy_ids: ['agent-policy-a', 'agent-policy-b'],
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
      // The duplicate-schedule bug: without dedup, this would be called twice
      // (once per agent policy) against the SAME package-policy id.
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);

      const [, , packagePolicyId, updatedPackagePolicy] = packagePolicyUpdate.mock.calls[0];
      expect(packagePolicyId).toBe('shared-package-policy');

      const writtenPacks = updatedPackagePolicy.inputs[0].config.osquery.value.packs;
      // The pack block appears exactly once (a single key), not duplicated.
      expect(Object.keys(writtenPacks)).toHaveLength(1);
      expect(writtenPacks).toHaveProperty('default--my-pack');
    });

    it('two agent policies resolving to distinct package policies each get updated once', async () => {
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      setupRoute({
        agentPolicies: [
          { id: 'agent-policy-a', name: 'agent-policy-a' },
          { id: 'agent-policy-b', name: 'agent-policy-b' },
        ],
        packagePolicies: [
          osqueryPackagePolicy({ id: 'package-policy-a', policy_ids: ['agent-policy-a'] }),
          osqueryPackagePolicy({ id: 'package-policy-b', policy_ids: ['agent-policy-b'] }),
        ],
        packagePolicyUpdate,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'my-pack',
          enabled: true,
          policy_ids: ['agent-policy-a', 'agent-policy-b'],
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(2);
      const updatedPolicyIds = packagePolicyUpdate.mock.calls.map((call) => call[2]);
      expect(updatedPolicyIds.sort()).toEqual(['package-policy-a', 'package-policy-b']);
    });

    it('1:1 agent-policy-to-package-policy targeting writes the same config as a single agent policy', async () => {
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      setupRoute({
        agentPolicies: [{ id: 'agent-policy-a', name: 'agent-policy-a' }],
        packagePolicies: [
          osqueryPackagePolicy({ id: 'package-policy-a', policy_ids: ['agent-policy-a'] }),
        ],
        packagePolicyUpdate,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'my-pack',
          enabled: true,
          policy_ids: ['agent-policy-a'],
          shards: { 'agent-policy-a': 50 },
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      const updatedPackagePolicy = packagePolicyUpdate.mock.calls[0][3];
      const writtenPack =
        updatedPackagePolicy.inputs[0].config.osquery.value.packs['default--my-pack'];
      // Parity with the pre-dedup behaviour for the 1:1 case: the single agent
      // policy's own shard is used unchanged and the surrounding pack block
      // (id/name/queries) is written intact — not just the shard.
      expect(writtenPack.shard).toBe(50);
      expect(writtenPack.pack_id).toBe('pack-id');
      expect(writtenPack.pack_name).toBe('my-pack');
      expect(Object.keys(writtenPack.queries)).toEqual(['q1']);
      expect(writtenPack.queries.q1).toEqual(
        expect.objectContaining({ query: 'SELECT 1', interval: 60 })
      );
    });

    it('shared package policy with differing shards resolves deterministically (max rule)', async () => {
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      setupRoute({
        agentPolicies: [
          { id: 'agent-policy-a', name: 'agent-policy-a' },
          { id: 'agent-policy-b', name: 'agent-policy-b' },
        ],
        packagePolicies: [
          osqueryPackagePolicy({
            id: 'shared-package-policy',
            policy_ids: ['agent-policy-a', 'agent-policy-b'],
          }),
        ],
        packagePolicyUpdate,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'my-pack',
          enabled: true,
          policy_ids: ['agent-policy-a', 'agent-policy-b'],
          shards: { 'agent-policy-a': 25, 'agent-policy-b': 75 },
          queries: { q1: { query: 'SELECT 1', interval: 60 } },
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(buildMockContext() as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      const updatedPackagePolicy = packagePolicyUpdate.mock.calls[0][3];
      const writtenPack =
        updatedPackagePolicy.inputs[0].config.osquery.value.packs['default--my-pack'];
      // Deterministic rule: the maximum of the two differing shards.
      expect(writtenPack.shard).toBe(75);
    });
  });
});
