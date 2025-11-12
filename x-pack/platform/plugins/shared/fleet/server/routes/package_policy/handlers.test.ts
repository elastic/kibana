/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { RouteConfig } from '@kbn/core/server';

import type {
  ListResult,
  PostDeletePackagePoliciesResponse,
  UpgradePackagePolicyResponse,
} from '../../../common';

import type { FleetAuthzRouter } from '../../services/security';

import { PACKAGE_POLICY_API_ROUTES } from '../../../common/constants';
import type {
  DryRunPackagePolicy,
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../../common/types';
import {
  agentPolicyService,
  appContextService,
  licenseService,
  packagePolicyService,
} from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type { PackagePolicyClient, FleetRequestHandlerContext } from '../..';
import type { UpdatePackagePolicyRequestSchema } from '../../types/rest_spec';
import {
  PackagePolicyResponseSchema,
  type AgentPolicy,
  type FleetRequestHandler,
  BulkGetPackagePoliciesResponseBodySchema,
  DeletePackagePoliciesResponseBodySchema,
  DeleteOnePackagePolicyResponseSchema,
  UpgradePackagePoliciesResponseBodySchema,
  DryRunPackagePoliciesResponseBodySchema,
  OrphanedPackagePoliciesResponseSchema,
  CreatePackagePolicyResponseSchema,
} from '../../types';
import type { PackagePolicy } from '../../types';

import { ListResponseSchema } from '../schema/utils';

import {
  bulkGetPackagePoliciesHandler,
  createPackagePolicyHandler,
  deleteOnePackagePolicyHandler,
  deletePackagePolicyHandler,
  dryRunUpgradePackagePolicyHandler,
  getOnePackagePolicyHandler,
  getOrphanedPackagePolicies,
  getPackagePoliciesHandler,
  upgradePackagePolicyHandler,
} from './handlers';
import { registerRoutes } from '.';

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyClient>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

function mockAgentPolicy(data: Partial<AgentPolicy>) {
  mockedAgentPolicyService.get.mockResolvedValue({
    id: 'agent-policy',
    status: 'active',
    package_policies: [],
    is_managed: false,
    namespace: 'default',
    revision: 1,
    name: 'Policy',
    updated_at: '2020-01-01',
    updated_by: 'qwerty',
    is_protected: false,
    ...data,
  });
}

jest.mock(
  '../../services/package_policy',
  (): {
    packagePolicyService: jest.Mocked<PackagePolicyClient>;
  } => {
    return {
      packagePolicyService: {
        _compilePackagePolicyInputs: jest.fn((packageInfo, vars, dataInputs) =>
          Promise.resolve(dataInputs)
        ),
        buildPackagePolicyFromPackage: jest.fn(),
        bulkCreate: jest.fn(),
        create: jest.fn((soClient, esClient, newData) =>
          Promise.resolve({
            ...newData,
            inputs: newData.inputs.map((input) => ({
              ...input,
              streams: input.streams.map((stream) => ({
                id: stream.data_stream.dataset,
                ...stream,
              })),
            })),
            id: '1',
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'elastic',
            created_at: new Date().toISOString(),
            created_by: 'elastic',
          })
        ),
        delete: jest.fn(),
        get: jest.fn(),
        getByIDs: jest.fn(),
        list: jest.fn(),
        listIds: jest.fn(),
        update: jest.fn(),
        // @ts-ignore
        runExternalCallbacks: jest.fn((callbackType, packagePolicy, context, request) =>
          callbackType === 'packagePolicyPostDelete'
            ? Promise.resolve(undefined)
            : Promise.resolve(packagePolicy)
        ),
        upgrade: jest.fn(),
        bulkUpgrade: jest.fn(),
        getUpgradeDryRunDiff: jest.fn(),
        enrichPolicyWithDefaultsFromPackage: jest
          .fn()
          .mockImplementation((soClient, newPolicy) => newPolicy),
      },
    };
  }
);

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      get: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
  };
});

jest.mock('../../services/epm/packages', () => {
  return {
    ensureInstalledPackage: jest.fn(() => Promise.resolve()),
    getPackageInfo: jest.fn(() => Promise.resolve()),
    getInstallation: jest.fn(),
    getInstallations: jest.fn().mockResolvedValue({
      saved_objects: [
        {
          attributes: { name: 'a-package', version: '1.0.0' },
        },
      ],
    }),
  };
});

jest.mock('../../services/agents/crud', () => {
  return {
    fetchAllAgentsByKuery: jest.fn(),
  };
});

jest.mock('../../services/agents/version_compatibility', () => {
  return {
    isAnyAgentBelowRequiredVersion: jest.fn(),
    extractMinVersionFromRanges: jest.fn((ranges) => {
      // Simple mock: return the first range as-is for testing
      // In real implementation, this extracts minimum version from semver ranges
      if (ranges && ranges.length > 0) {
        const range = ranges[0];
        // Extract version from common patterns like "8.12.0", "^8.12.0", ">=8.12.0"
        const match = range.match(/(\d+\.\d+\.\d+)/);
        return match ? match[1] : undefined;
      }
      return undefined;
    }),
  };
});

let testPackagePolicy: PackagePolicy;

describe('When calling package policy', () => {
  let routerMock: jest.Mocked<FleetAuthzRouter>;
  let routeHandler: FleetRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter() as unknown as jest.Mocked<FleetAuthzRouter>;
    registerRoutes(routerMock);
  });

  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>;
    response = httpServerMock.createResponseFactory();
    testPackagePolicy = {
      agents: 100,
      created_at: '2022-12-19T20:43:45.879Z',
      created_by: 'elastic',
      description: '',
      enabled: true,
      id: '123',
      inputs: [
        {
          streams: [
            {
              id: '1',
              compiled_stream: {},
              enabled: true,
              keep_enabled: false,
              release: 'beta',
              vars: { var: { type: 'text', value: 'value', frozen: false } },
              config: { config: { type: 'text', value: 'value', frozen: false } },
              data_stream: { dataset: 'apache.access', type: 'logs', elasticsearch: {} },
            },
          ],
          compiled_input: '',
          id: '1',
          enabled: true,
          type: 'logs',
          policy_template: '',
          keep_enabled: false,
          vars: { var: { type: 'text', value: 'value', frozen: false } },
          config: { config: { type: 'text', value: 'value', frozen: false } },
        },
      ],
      vars: { var: { type: 'text', value: 'value', frozen: false } },
      name: 'Package Policy 123',
      namespace: 'default',
      package: {
        name: 'a-package',
        title: 'package A',
        version: '1.0.0',
        experimental_data_stream_features: [{ data_stream: 'logs', features: { tsdb: true } }],
        requires_root: false,
      },
      policy_id: 'agent-policy-id-a',
      policy_ids: ['agent-policy-id-a'],
      revision: 1,
      updated_at: '2022-12-19T20:43:45.879Z',
      updated_by: 'elastic',
      version: '1.0.0',
      secret_references: [
        {
          id: 'ref1',
        },
      ],
      spaceIds: ['space1'],
      elasticsearch: {
        'index_template.mappings': {
          dynamic_templates: [],
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('Update api handler', () => {
    const getUpdateKibanaRequest = (
      newData?: typeof UpdatePackagePolicyRequestSchema.body
    ): KibanaRequest<
      typeof UpdatePackagePolicyRequestSchema.params,
      undefined,
      typeof UpdatePackagePolicyRequestSchema.body
    > => {
      return httpServerMock.createKibanaRequest<
        typeof UpdatePackagePolicyRequestSchema.params,
        undefined,
        typeof UpdatePackagePolicyRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'put',
        params: { packagePolicyId: '1' },
        body: newData || {},
      });
    };

    const existingPolicy: PackagePolicy = {
      id: '1',
      revision: 1,
      created_at: '',
      created_by: '',
      updated_at: '',
      updated_by: '',
      policy_ids: ['2'],
      name: 'endpoint-1',
      description: 'desc',
      policy_id: '2',
      enabled: true,
      inputs: [
        {
          type: 'logfile',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'apache.access',
              },
              id: '1',
            },
          ],
        },
      ],
      namespace: 'default',
      package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.5.0' },
      vars: {
        paths: {
          value: ['/var/log/apache2/access.log*'],
          type: 'text',
        },
      },
    };

    beforeEach(() => {
      // @ts-ignore
      const putMock = routerMock.versioned.put.mock;
      // @ts-ignore
      routeConfig = putMock.calls.find(([{ path }]) =>
        path.startsWith(PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN)
      )!;
      routeHandler = putMock.results[0].value.addVersion.mock.calls[0][1];
    });

    beforeEach(() => {
      jest.spyOn(licenseService, 'hasAtLeast').mockClear();
      packagePolicyServiceMock.update.mockImplementation((soClient, esClient, policyId, newData) =>
        Promise.resolve({ ...existingPolicy, ...newData } as PackagePolicy)
      );
      packagePolicyServiceMock.get.mockResolvedValue({
        ...existingPolicy,
        inputs: [
          {
            ...existingPolicy.inputs[0],
            compiled_input: '',
            streams: [
              {
                ...existingPolicy.inputs[0].streams[0],
                compiled_stream: {},
              },
            ],
          },
        ],
      });
      (agentPolicyService.get as jest.Mock).mockResolvedValue({ inputs: [] });
    });

    it('should use existing package policy props if not provided by request', async () => {
      const request = getUpdateKibanaRequest();
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: existingPolicy },
      });
      const validationResp = PackagePolicyResponseSchema.validate(existingPolicy);
      expect(validationResp).toEqual(existingPolicy);
    });

    it('should use request package policy props if provided by request', async () => {
      const newData = {
        name: 'endpoint-2',
        description: '',
        policy_id: '3',
        policy_ids: ['3'],
        enabled: false,
        inputs: [
          {
            type: 'metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'apache.access',
                },
                id: '1',
              },
            ],
          },
        ],
        namespace: 'namespace',
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      const responseItem = { ...existingPolicy, ...newData };
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: responseItem },
      });

      const validationResp = PackagePolicyResponseSchema.validate(responseItem);
      expect(validationResp).toEqual(responseItem);
    });

    it('should override props provided by request only', async () => {
      const newData = {
        namespace: 'namespace',
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: { ...existingPolicy, namespace: 'namespace' } },
      });
    });

    it('should throw if policy_ids changed on agentless integration', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValue({
        supports_agentless: true,
        inputs: [],
      });
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      const request = getUpdateKibanaRequest({ policy_ids: ['1', '2'] } as any);

      await expect(() => routeHandler(context, request, response)).rejects.toThrow(
        /Cannot change agent policies of an agentless integration/
      );
    });

    it('should rename the agentless agent policy to sync with the package policy name if agentless is enabled', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agent-policy',
        { name: 'Agentless policy for new-name' },
        { force: true }
      );
    });
    it('should not rename the agentless agent policy if agentless is not enabled in cloud environment', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: false },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if cloud is not enabled', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);

      mockAgentPolicy({
        supports_agentless: true,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if the package policy name has not changed', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: true,
        name: 'Agentless policy for new-name',
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
    it('should not rename the agentless agent policy if the agent policy does not support agentless', async () => {
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: { enabled: true },
      } as any);

      mockAgentPolicy({
        supports_agentless: false,
      });

      const request = getUpdateKibanaRequest({ name: 'new-name' } as any);
      await routeHandler(context, request, response);

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });

    it('should disable an input if is enabled and has all its stream disabled', async () => {
      const inputs = [
        {
          type: 'input-logs',
          enabled: true,
          streams: [
            {
              enabled: false,
              data_stream: {
                type: 'logs',
                dataset: 'test.some_logs',
              },
            },
          ],
        },
      ];
      const request = getUpdateKibanaRequest({
        inputs,
      } as any);
      await routeHandler(context, request, response);
      const responseItem = {
        ...existingPolicy,
        inputs: [
          {
            type: 'input-logs',
            enabled: false,
            streams: [
              {
                enabled: false,
                data_stream: {
                  type: 'logs',
                  dataset: 'test.some_logs',
                },
              },
            ],
          },
        ],
      };
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          item: responseItem,
        },
      });

      const validationResp = PackagePolicyResponseSchema.validate(responseItem);
      expect(validationResp).toEqual(responseItem);
    });

    it('should reject when package update requires higher agent version and force is false', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Package update requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '0.6.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents on the policy have version 8.11.0
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      const newData = {
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
      };
      const request = getUpdateKibanaRequest(newData as any);

      await expect(() => routeHandler(context, request, response)).rejects.toThrow(
        /required version range.*8\.12\.0/i
      );
    });

    it('should allow package update when all agents meet version requirement', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Package update requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '0.6.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // All agents meet the requirement
      isAnyAgentBelowRequiredVersion.mockResolvedValue(false);

      const newData = {
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
      };
      const request = getUpdateKibanaRequest(newData as any);

      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalled();
    });

    it('should allow package update with force:true even if agents have lower versions', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Package update requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '0.6.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents have lower versions, but force is true
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      const newData = {
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
        force: true,
      };
      const request = getUpdateKibanaRequest(newData as any);

      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalled();
      // Should not have called the version check since force is true
      expect(isAnyAgentBelowRequiredVersion).not.toHaveBeenCalled();
    });

    it('should check agent versions when policy assignment changes', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Package requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'endpoint',
        version: '0.6.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents on the new policy have lower versions
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      const newData = {
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
        policy_ids: ['3'], // Different policy than existing
      };
      const request = getUpdateKibanaRequest(newData as any);

      await expect(() => routeHandler(context, request, response)).rejects.toThrow(
        /required version range.*8\.12\.0/i
      );

      // Should only check the destination policy IDs (where the package policy will be after update)
      expect(isAnyAgentBelowRequiredVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          policyIds: ['3'], // Only the new/destination policy IDs
        })
      );
    });
  });

  describe('list api handler', () => {
    it('should return agent count when `withAgentCount` query param is used', async () => {
      packagePolicyServiceMock.list.mockResolvedValue({
        total: 1,
        perPage: 10,
        page: 1,
        items: [testPackagePolicy],
      });
      const request = httpServerMock.createKibanaRequest({
        query: {
          withAgentCount: true,
        },
      });
      (
        (await context.core).elasticsearch.client.asInternalUser.search as jest.Mock
      ).mockImplementation(() => {
        return {
          took: 3,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 100,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            agent_counts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'agent-policy-id-a',
                  doc_count: 100,
                },
              ],
            },
          },
        };
      });

      await getPackagePoliciesHandler(context, request, response);
      const responseBody: ListResult<PackagePolicy> = {
        page: 1,
        perPage: 10,
        total: 1,
        items: [testPackagePolicy],
      };
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });

      const validationResp = ListResponseSchema(PackagePolicyResponseSchema).validate(responseBody);
      expect(validationResp).toEqual(responseBody);
    });

    it('should populate min_agent_version for all items when packages have version requirements', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy1 = {
        ...testPackagePolicy,
        id: '1',
        package: {
          name: 'package-1',
          title: 'Package 1',
          version: '1.0.0',
        },
      };

      const packagePolicy2 = {
        ...testPackagePolicy,
        id: '2',
        package: {
          name: 'package-2',
          title: 'Package 2',
          version: '2.0.0',
        },
      };

      packagePolicyServiceMock.list.mockResolvedValue({
        total: 2,
        perPage: 10,
        page: 1,
        items: [packagePolicy1, packagePolicy2],
      });

      getPackageInfo
        .mockResolvedValueOnce({
          name: 'package-1',
          version: '1.0.0',
          conditions: { agent: { version: '8.12.0' } },
        })
        .mockResolvedValueOnce({
          name: 'package-2',
          version: '2.0.0',
          conditions: { agent: { version: '8.13.0' } },
        });

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBe('8.12.0');
      expect((callArgs?.body as any)?.items?.[1]?.min_agent_version).toBe('8.13.0');
    });

    it('should return undefined for min_agent_version when packages have no version requirements', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      packagePolicyServiceMock.list.mockResolvedValue({
        total: 1,
        perPage: 10,
        page: 1,
        items: [packagePolicy],
      });

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: {},
      });

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
    });

    it('should handle package info retrieval failures gracefully', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      packagePolicyServiceMock.list.mockResolvedValue({
        total: 1,
        perPage: 10,
        page: 1,
        items: [packagePolicy],
      });

      getPackageInfo.mockRejectedValue(new Error('Package not found'));

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      // Should not populate min_agent_version when package info fails
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
    });
  });

  describe('bulk api handler', () => {
    it('should return valid response', async () => {
      const items: PackagePolicy[] = [testPackagePolicy];
      packagePolicyServiceMock.getByIDs.mockResolvedValue(items);
      const request = httpServerMock.createKibanaRequest({
        query: {},
        body: { ids: ['1'] },
      });
      await bulkGetPackagePoliciesHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { items },
      });
      const validationResp = BulkGetPackagePoliciesResponseBodySchema.validate({ items });
      expect(validationResp).toEqual({ items });
    });

    it('should populate min_agent_version for all items when packages have version requirements', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy1 = {
        ...testPackagePolicy,
        id: '1',
        package: {
          name: 'package-1',
          title: 'Package 1',
          version: '1.0.0',
        },
      };

      const packagePolicy2 = {
        ...testPackagePolicy,
        id: '2',
        package: {
          name: 'package-2',
          title: 'Package 2',
          version: '2.0.0',
        },
      };

      const items: PackagePolicy[] = [packagePolicy1, packagePolicy2];
      packagePolicyServiceMock.getByIDs.mockResolvedValue(items);

      getPackageInfo
        .mockResolvedValueOnce({
          name: 'package-1',
          version: '1.0.0',
          conditions: { agent: { version: '8.12.0' } },
        })
        .mockResolvedValueOnce({
          name: 'package-2',
          version: '2.0.0',
          conditions: { agent: { version: '8.13.0' } },
        });

      const request = httpServerMock.createKibanaRequest({
        query: {},
        body: { ids: ['1', '2'] },
      });

      await bulkGetPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBe('8.12.0');
      expect((callArgs?.body as any)?.items?.[1]?.min_agent_version).toBe('8.13.0');
    });

    it('should return undefined for min_agent_version when packages have no version requirements', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      const items: PackagePolicy[] = [packagePolicy];
      packagePolicyServiceMock.getByIDs.mockResolvedValue(items);

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: {},
      });

      const request = httpServerMock.createKibanaRequest({
        query: {},
        body: { ids: ['1'] },
      });

      await bulkGetPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
    });

    it('should handle package info retrieval failures gracefully', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      const items: PackagePolicy[] = [packagePolicy];
      packagePolicyServiceMock.getByIDs.mockResolvedValue(items);

      getPackageInfo.mockRejectedValue(new Error('Package not found'));

      const request = httpServerMock.createKibanaRequest({
        query: {},
        body: { ids: ['1'] },
      });

      await bulkGetPackagePoliciesHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      // Should not populate min_agent_version when package info fails
      expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
    });
  });

  describe('orphaned package policies api handler', () => {
    it('should return valid response', async () => {
      const items: PackagePolicy[] = [testPackagePolicy];
      const expectedResponse = {
        items,
        total: 1,
      };
      packagePolicyServiceMock.list.mockResolvedValue({
        items: [testPackagePolicy],
        total: 1,
        page: 1,
        perPage: 20,
      });
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        perPage: 20,
      });
      await getOrphanedPackagePolicies(context, {} as any, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: expectedResponse,
      });
      const validationResp = OrphanedPackagePoliciesResponseSchema.validate(expectedResponse);
      expect(validationResp).toEqual(expectedResponse);
    });
  });

  describe('get api handler', () => {
    it('should return valid response', async () => {
      packagePolicyServiceMock.get.mockResolvedValue(testPackagePolicy);
      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
      });
      await getOnePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: testPackagePolicy },
      });
      const validationResp = PackagePolicyResponseSchema.validate(testPackagePolicy);
      expect(validationResp).toEqual(testPackagePolicy);
    });

    it('should populate min_agent_version when package has agent version requirement', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicyWithVersion = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      packagePolicyServiceMock.get.mockResolvedValue(packagePolicyWithVersion);

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
      });

      await getOnePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.item?.min_agent_version).toBe('8.12.0');
    });

    it('should return undefined for min_agent_version when package has no version requirement', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicyWithoutVersion = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      packagePolicyServiceMock.get.mockResolvedValue(packagePolicyWithoutVersion);

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: {},
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
      });

      await getOnePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
    });

    it('should handle package info retrieval failures gracefully', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const packagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
      };

      packagePolicyServiceMock.get.mockResolvedValue(packagePolicy);
      getPackageInfo.mockReset();
      getPackageInfo.mockRejectedValue(new Error('Package not found'));

      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
      });

      await getOnePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      // Should not populate min_agent_version when package info fails
      expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
    });

    it('should return undefined for min_agent_version when package policy has no package', async () => {
      const packagePolicyWithoutPackage = {
        ...testPackagePolicy,
        package: undefined,
      };

      packagePolicyServiceMock.get.mockResolvedValue(packagePolicyWithoutPackage);

      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
      });

      await getOnePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
    });

    it('should return valid response simplified format', async () => {
      packagePolicyServiceMock.get.mockResolvedValue(testPackagePolicy);
      const request = httpServerMock.createKibanaRequest({
        params: {
          packagePolicyId: '1',
        },
        query: {
          format: 'simplified',
        },
      });
      await getOnePackagePolicyHandler(context, request, response);
      const simplifiedPackagePolicy = {
        ...testPackagePolicy,
        inputs: {
          logs: {
            enabled: true,
            streams: {
              'apache.access': {
                enabled: true,
                vars: {
                  var: 'value',
                },
              },
            },
            vars: {
              var: 'value',
            },
          },
        },
        vars: {
          var: 'value',
        },
      };
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: simplifiedPackagePolicy },
      });
      const validationResp = PackagePolicyResponseSchema.validate(simplifiedPackagePolicy);
      expect(validationResp).toEqual(simplifiedPackagePolicy);
    });
  });

  describe('create api handler', () => {
    it('should return valid response', async () => {
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      // Mock no agent version constraints
      isAnyAgentBelowRequiredVersion.mockResolvedValue(false);
      // Mock getPackageInfo to return package info without version requirements
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: {},
      });

      packagePolicyServiceMock.get.mockResolvedValue(testPackagePolicy);
      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);
      const request = httpServerMock.createKibanaRequest({
        body: testPackagePolicy,
      });
      const expectedResponse = { item: testPackagePolicy };
      await createPackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: expectedResponse,
      });
      const validationResp = CreatePackagePolicyResponseSchema.validate(expectedResponse);
      expect(validationResp).toEqual(expectedResponse);
    });

    it('should reject when package requires higher agent version and force is false', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Package requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents on the policy have version 8.11.0
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);

      const request = httpServerMock.createKibanaRequest({
        body: { ...testPackagePolicy, force: false },
      });

      await expect(() => createPackagePolicyHandler(context, request, response)).rejects.toThrow(
        /required version range.*8\.12\.0/i
      );
    });

    it('should succeed when all targeted agents satisfy required version', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // All agents meet the requirement
      isAnyAgentBelowRequiredVersion.mockResolvedValue(false);

      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);

      const request = httpServerMock.createKibanaRequest({
        body: { ...testPackagePolicy, force: false },
      });

      await createPackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({ body: { item: testPackagePolicy } });
    });

    it('should allow creation when force is true even if versions are lower', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents have lower versions, but force is true so version check should not be called
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);

      const request = httpServerMock.createKibanaRequest({
        body: { ...testPackagePolicy, force: true },
      });

      await createPackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({ body: { item: testPackagePolicy } });
      // Should not have called the version check since force is true
      expect(isAnyAgentBelowRequiredVersion).not.toHaveBeenCalled();
    });
  });

  describe('bulk delete api handler', () => {
    it('should return valid response', async () => {
      const responseBody: PostDeletePackagePoliciesResponse = [
        {
          id: '1',
          name: 'policy',
          success: true,
          policy_ids: ['1'],
          output_id: '1',
          package: {
            name: 'package',
            version: '1.0.0',
            title: 'Package',
          },
          statusCode: 409,
          body: {
            message: 'conflict',
          },
        },
      ];
      packagePolicyServiceMock.delete.mockResolvedValue(responseBody);
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });
      await deletePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
      const validationResp = DeletePackagePoliciesResponseBodySchema.validate(responseBody);
      expect(validationResp).toEqual(responseBody);
    });
  });

  describe('delete api handler', () => {
    it('should return valid response', async () => {
      const responseBody = {
        id: '1',
      };
      packagePolicyServiceMock.delete.mockResolvedValue([
        {
          id: '1',
          name: 'policy',
          success: true,
          policy_ids: ['1'],
          output_id: '1',
          package: {
            name: 'package',
            version: '1.0.0',
            title: 'Package',
          },
          statusCode: 409,
          body: {
            message: 'conflict',
          },
        },
      ]);
      const request = httpServerMock.createKibanaRequest({
        body: {
          force: false,
        },
        params: {
          packagePolicyId: '1',
        },
      });
      await deleteOnePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
      const validationResp = DeleteOnePackagePolicyResponseSchema.validate(responseBody);
      expect(validationResp).toEqual(responseBody);
    });
  });

  describe('upgrade api handler', () => {
    it('should return valid response', async () => {
      const responseBody: UpgradePackagePolicyResponse = [
        {
          id: '1',
          name: 'policy',
          success: true,
          statusCode: 200,
          body: {
            message: 'success',
          },
        },
      ];
      packagePolicyServiceMock.bulkUpgrade.mockResolvedValue(responseBody);
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });
      await upgradePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
      const validationResp = UpgradePackagePoliciesResponseBodySchema.validate(responseBody);
      expect(validationResp).toEqual(responseBody);
    });
  });

  describe('dry run upgrade api handler', () => {
    it('should return valid response', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      // Mock no version requirements to avoid triggering version check
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '1.0.0',
        conditions: {},
      });
      isAnyAgentBelowRequiredVersion.mockResolvedValue(false);

      const dryRunPackagePolicy: DryRunPackagePolicy = {
        description: '',
        enabled: true,
        id: '123',
        inputs: [
          {
            streams: [
              {
                id: '1',
                enabled: true,
                keep_enabled: false,
                release: 'beta',
                vars: { var: { type: 'text', value: 'value', frozen: false } },
                config: { config: { type: 'text', value: 'value', frozen: false } },
                data_stream: { dataset: 'apache.access', type: 'logs', elasticsearch: {} },
              },
            ],
            id: '1',
            enabled: true,
            type: 'logs',
            policy_template: '',
            keep_enabled: false,
            vars: { var: { type: 'text', value: 'value', frozen: false } },
            config: { config: { type: 'text', value: 'value', frozen: false } },
          },
        ],
        vars: { var: { type: 'text', value: 'value', frozen: false } },
        name: 'Package Policy 123',
        namespace: 'default',
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
          experimental_data_stream_features: [{ data_stream: 'logs', features: { tsdb: true } }],
          requires_root: false,
        },
        policy_id: 'agent-policy-id-a',
        policy_ids: ['agent-policy-id-a'],
        errors: [{ key: 'error', message: 'error' }],
        missingVars: ['var'],
      };
      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [testPackagePolicy, dryRunPackagePolicy],
        agent_diff: [
          [
            {
              id: '1',
              name: 'input',
              revision: 1,
              type: 'logs',
              data_stream: { namespace: 'default' },
              use_output: 'default',
              package_policy_id: '1',
              streams: [
                {
                  id: 'logfile-log.logs-d46700b2-47f8-4b1a-9153-14a717dc5edf',
                  data_stream: {
                    dataset: 'generic',
                  },
                  paths: ['/var/tmp'],
                  ignore_older: '72h',
                },
              ],
            },
          ],
        ],
      };
      const responseBody: UpgradePackagePolicyDryRunResponse = [responseItem, responseItem];
      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseBody[0]);
      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseBody[1]);
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '2'],
        },
      });
      await dryRunUpgradePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
      const validationResp = DryRunPackagePoliciesResponseBodySchema.validate(responseBody);
      expect(validationResp).toEqual(responseBody);
    });

    it('should set hasErrors to true and add error when agents are incompatible', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      const currentPackagePolicy = {
        ...testPackagePolicy,
        policy_ids: ['agent-policy-1'],
      };

      const proposedPackagePolicy: DryRunPackagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '2.0.0',
        },
        policy_ids: ['agent-policy-1'],
      };

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [currentPackagePolicy, proposedPackagePolicy],
        agent_diff: [[]],
      };

      // Package requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '2.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // Some agents are below required version
      isAnyAgentBelowRequiredVersion.mockResolvedValue(true);

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      const result = (callArgs?.body as any)?.[0];

      expect(result.hasErrors).toBe(true);
      expect(result.diff[1].errors).toBeDefined();
      expect(result.diff[1].errors?.length).toBeGreaterThan(0);
      expect(result.diff[1].errors?.[result.diff[1].errors.length - 1].message).toMatch(
        /required version range.*8\.12\.0/i
      );
      expect(result.diff[1].errors?.[result.diff[1].errors.length - 1].message).toMatch(
        /Use force:true to override/i
      );
    });

    it('should not add errors when all agents are compatible', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      const currentPackagePolicy = {
        ...testPackagePolicy,
        policy_ids: ['agent-policy-1'],
      };

      const proposedPackagePolicy: DryRunPackagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '2.0.0',
        },
        policy_ids: ['agent-policy-1'],
      };

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [currentPackagePolicy, proposedPackagePolicy],
        agent_diff: [[]],
      };

      // Package requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '2.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      // All agents meet the requirement
      isAnyAgentBelowRequiredVersion.mockResolvedValue(false);

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      const result = (callArgs?.body as any)?.[0];

      expect(result.hasErrors).toBe(false);
      // Should not have added any version-related errors
      const versionErrors = (result.diff[1].errors || []).filter((e: any) =>
        e.message?.includes('required version range')
      );
      expect(versionErrors.length).toBe(0);
    });

    it('should handle package info retrieval failures gracefully', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

      const currentPackagePolicy = {
        ...testPackagePolicy,
        policy_ids: ['agent-policy-1'],
      };

      const proposedPackagePolicy: DryRunPackagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '2.0.0',
        },
        policy_ids: ['agent-policy-1'],
      };

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [currentPackagePolicy, proposedPackagePolicy],
        agent_diff: [[]],
      };

      // Package info retrieval fails
      getPackageInfo.mockRejectedValue(new Error('Package not found'));

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      const callArgs = response.ok.mock.calls[0]?.[0];
      const result = (callArgs?.body as any)?.[0];

      // Should not have modified hasErrors or added errors
      expect(result.hasErrors).toBe(false);
    });

    it('should not check agent versions when package has no version requirements', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      const currentPackagePolicy = {
        ...testPackagePolicy,
        policy_ids: ['agent-policy-1'],
      };

      const proposedPackagePolicy: DryRunPackagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '2.0.0',
        },
        policy_ids: ['agent-policy-1'],
      };

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [currentPackagePolicy, proposedPackagePolicy],
        agent_diff: [[]],
      };

      // Package has no version requirements
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '2.0.0',
        conditions: {},
      });

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      // Should not have called version check
      expect(isAnyAgentBelowRequiredVersion).not.toHaveBeenCalled();
    });

    it('should not check agent versions when there are no policy IDs', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      const currentPackagePolicy = {
        ...testPackagePolicy,
        policy_ids: [],
        policy_id: undefined,
      };

      const proposedPackagePolicy: DryRunPackagePolicy = {
        ...testPackagePolicy,
        package: {
          name: 'a-package',
          title: 'package A',
          version: '2.0.0',
        },
        policy_ids: [],
        policy_id: undefined,
      };

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: false,
        name: 'policy',
        statusCode: 200,
        body: {
          message: 'success',
        },
        diff: [currentPackagePolicy, proposedPackagePolicy],
        agent_diff: [[]],
      };

      // Package requires agent >= 8.12.0
      getPackageInfo.mockResolvedValue({
        name: 'a-package',
        version: '2.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      // Should not have called version check when there are no policy IDs
      expect(isAnyAgentBelowRequiredVersion).not.toHaveBeenCalled();
    });

    it('should not check agent versions when dry run has errors', async () => {
      const { getPackageInfo } = jest.requireMock('../../services/epm/packages');
      const { isAnyAgentBelowRequiredVersion } = jest.requireMock(
        '../../services/agents/version_compatibility'
      );

      const responseItem: UpgradePackagePolicyDryRunResponseItem = {
        hasErrors: true,
        name: 'policy',
        statusCode: 400,
        body: {
          message: 'error',
        },
        diff: [testPackagePolicy, testPackagePolicy],
        agent_diff: [[]],
      };

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseItem);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1'],
        },
      });

      await dryRunUpgradePackagePolicyHandler(context, request, response);

      // Should return error response
      expect(response.customError).toHaveBeenCalled();
      // Should not have called version check when dry run already has errors
      expect(getPackageInfo).not.toHaveBeenCalled();
      expect(isAnyAgentBelowRequiredVersion).not.toHaveBeenCalled();
    });
  });
});
