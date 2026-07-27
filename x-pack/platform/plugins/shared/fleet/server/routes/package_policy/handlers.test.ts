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
import { getInstallation, getPackageInfo, removeInstallation } from '../../services/epm/packages';

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
      getByIds: jest.fn(),
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
    removeInstallation: jest.fn(),
    getInstallations: jest.fn().mockResolvedValue({
      saved_objects: [
        {
          attributes: { name: 'a-package', version: '1.0.0' },
        },
      ],
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
      var_group_selections: { auth_method: 'api_key' },
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
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ is_managed: false }]);
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

    it('should update var_group_selections when provided', async () => {
      const newData = {
        var_group_selections: { auth_method: 'oauth' },
      };
      const request = getUpdateKibanaRequest(newData as any);

      await routeHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: { ...existingPolicy, ...newData } },
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

    it('should throw if output_id changed on a managed agent policy', async () => {
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ is_managed: true }]);
      const request = getUpdateKibanaRequest({ output_id: 'new-output' } as any);

      await expect(() => routeHandler(context, request, response)).rejects.toThrow(
        /Cannot change the output of a package policy belonging to a managed agent policy/
      );
    });

    it('should not throw if output_id unchanged on a managed agent policy', async () => {
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ is_managed: true }]);
      // existingPolicy has no output_id, so passing undefined should not trigger the check
      const request = getUpdateKibanaRequest({ name: 'endpoint-2' } as any);

      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalled();
    });

    it('should allow output_id change on a non-managed agent policy', async () => {
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ is_managed: false }]);
      const request = getUpdateKibanaRequest({ output_id: 'new-output' } as any);

      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalled();
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
        { bumpRevision: false, force: true }
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

    describe('when disableAgentlessLegacyAPI is enabled', () => {
      beforeEach(() => {
        appContextService.start(
          createAppContextStartContractMock({}, false, undefined, {
            disableAgentlessLegacyAPI: true,
          })
        );
      });

      it('should reject when the existing package policy is agentless', async () => {
        packagePolicyServiceMock.get.mockResolvedValue({
          ...existingPolicy,
          supports_agentless: true,
        });

        await expect(routeHandler(context, getUpdateKibanaRequest(), response)).rejects.toThrow(
          /To update managed integrations.*Offending ID: 1\./
        );
        expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      });

      it('should reject when the request body sets supports_agentless', async () => {
        await expect(
          routeHandler(
            context,
            getUpdateKibanaRequest({ supports_agentless: true } as any),
            response
          )
        ).rejects.toThrow(/To update managed integrations/);
        expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      });

      it('should reject when request policy_ids target an agentless agent policy', async () => {
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: 'agentless', is_managed: false, supports_agentless: true },
        ]);

        await expect(
          routeHandler(
            context,
            getUpdateKibanaRequest({ policy_ids: ['agentless'] } as any),
            response
          )
        ).rejects.toThrow(
          /To add integrations to a managed integration.*Offending IDs: agentless\./
        );
        expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      });

      it('should reject when request policy_id targets an agentless agent policy', async () => {
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: 'agentless', is_managed: false, supports_agentless: true },
        ]);

        await expect(
          routeHandler(context, getUpdateKibanaRequest({ policy_id: 'agentless' } as any), response)
        ).rejects.toThrow(/To add integrations to a managed integration/);
        expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      });

      it('should reject when a parent agent policy is agentless', async () => {
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: '2', is_managed: false, supports_agentless: true },
        ]);

        await expect(routeHandler(context, getUpdateKibanaRequest(), response)).rejects.toThrow(
          /To update managed integrations.*Offending ID: 1\./
        );
        expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      });

      it('should allow updating non-agentless package policies', async () => {
        await routeHandler(context, getUpdateKibanaRequest(), response);

        expect(response.ok).toHaveBeenCalled();
      });
    });

    it('should allow updating agentless package policies when disableAgentlessLegacyAPI is disabled', async () => {
      packagePolicyServiceMock.get.mockResolvedValue({
        ...existingPolicy,
        supports_agentless: true,
      });

      await routeHandler(context, getUpdateKibanaRequest(), response);

      expect(response.ok).toHaveBeenCalled();
      // Flag off: the legacy agentless write is allowed but logged so it stays
      // measurable before the flag is flipped fleet-wide.
      expect(appContextService.getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
      );
    });

    it('should not log the legacy agentless deprecation for non-agentless updates when the flag is disabled', async () => {
      await routeHandler(context, getUpdateKibanaRequest(), response);

      expect(response.ok).toHaveBeenCalled();
      expect(appContextService.getLogger().warn).not.toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
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
  });

  it('should filter out duplicate ids', async () => {
    const items: PackagePolicy[] = [testPackagePolicy];
    packagePolicyServiceMock.getByIDs.mockResolvedValue(items);
    const request = httpServerMock.createKibanaRequest({
      query: {},
      body: { ids: ['1', '1'] },
    });
    await bulkGetPackagePoliciesHandler(context, request, response);
    expect(response.ok).toHaveBeenCalledWith({
      body: { items },
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
    it('should not allow to create agentless policies if disableAgentlessLegacyAPI is enabled', async () => {
      appContextService.start(
        createAppContextStartContractMock({}, false, undefined, {
          disableAgentlessLegacyAPI: true,
        })
      );

      const request = httpServerMock.createKibanaRequest({
        body: { ...testPackagePolicy, supports_agentless: true },
      });

      await expect(createPackagePolicyHandler(context, request, response)).rejects.toThrow(
        /To create managed integrations, use the managed integrations API./
      );
    });

    it('should return valid response', async () => {
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

    describe('when disableAgentlessLegacyAPI is enabled', () => {
      const agentlessOnlyTemplate = {
        name: 'template',
        deployment_modes: { agentless: { enabled: true }, default: { enabled: false } },
      };
      const mixedTemplate = {
        name: 'template',
        deployment_modes: { agentless: { enabled: true }, default: { enabled: true } },
      };

      beforeEach(() => {
        appContextService.start(
          createAppContextStartContractMock({}, false, undefined, {
            disableAgentlessLegacyAPI: true,
          })
        );
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ is_managed: false }]);
      });

      it('should reject packages that only support agentless deployment', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          policy_templates: [agentlessOnlyTemplate],
        });
        (getInstallation as jest.Mock).mockResolvedValue({ install_status: 'installing' });

        const request = httpServerMock.createKibanaRequest({
          body: testPackagePolicy,
        });

        await expect(createPackagePolicyHandler(context, request, response)).rejects.toThrow(
          /can only be used as a managed integration/
        );
        // The rejection happens before anything is installed or created, so the
        // catch-block rollback must not run — even when a concurrent request has
        // the package mid-install.
        expect(removeInstallation).not.toHaveBeenCalled();
      });

      it('should reject when a target agent policy is agentless', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          policy_templates: [mixedTemplate],
        });
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { supports_agentless: true },
        ]);

        const request = httpServerMock.createKibanaRequest({
          body: testPackagePolicy,
        });

        await expect(createPackagePolicyHandler(context, request, response)).rejects.toThrow(
          /To add integrations to a managed integration/
        );
      });

      it('should allow mixed-deployment packages in default mode', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          policy_templates: [mixedTemplate],
        });
        (
          (await context.fleet).packagePolicyService
            .asCurrentUser as jest.Mocked<PackagePolicyClient>
        ).create.mockResolvedValue(testPackagePolicy);

        const request = httpServerMock.createKibanaRequest({
          body: testPackagePolicy,
        });

        await createPackagePolicyHandler(context, request, response);

        expect(response.ok).toHaveBeenCalled();
      });

      it('should resolve the agentless-only check with skipArchive to avoid a full archive download', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          policy_templates: [mixedTemplate],
        });
        (
          (await context.fleet).packagePolicyService
            .asCurrentUser as jest.Mocked<PackagePolicyClient>
        ).create.mockResolvedValue(testPackagePolicy);

        const request = httpServerMock.createKibanaRequest({ body: testPackagePolicy });

        await createPackagePolicyHandler(context, request, response);

        // The pre-`try` agentless-only detection only needs deployment_modes, so it
        // must resolve from the registry manifest (skipArchive) rather than pulling
        // and verifying the full archive before any other validation.
        expect(getPackageInfo).toHaveBeenCalledWith(expect.objectContaining({ skipArchive: true }));
      });
    });

    it('should allow to create agentless package policies when disableAgentlessLegacyAPI is disabled', async () => {
      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);

      const request = httpServerMock.createKibanaRequest({
        body: { ...testPackagePolicy, supports_agentless: true },
      });

      await createPackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      expect(getPackageInfo).not.toHaveBeenCalled();
      expect(agentPolicyService.getByIds).not.toHaveBeenCalled();
      // Flag off: the legacy agentless write is allowed but logged so it stays
      // measurable before the flag is flipped fleet-wide.
      expect(appContextService.getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
      );
    });

    it('should not log the legacy agentless deprecation for non-agentless creates when the flag is disabled', async () => {
      packagePolicyServiceMock.get.mockResolvedValue(testPackagePolicy);
      (
        (await context.fleet).packagePolicyService.asCurrentUser as jest.Mocked<PackagePolicyClient>
      ).create.mockResolvedValue(testPackagePolicy);

      const request = httpServerMock.createKibanaRequest({ body: testPackagePolicy });

      await createPackagePolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      expect(appContextService.getLogger().warn).not.toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
      );
    });
  });

  describe('bulk delete api handler', () => {
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

    it('should return valid response', async () => {
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

    it('should deduplicate ids', async () => {
      packagePolicyServiceMock.delete.mockResolvedValue(responseBody);
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '1'],
        },
      });
      await deletePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
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

    it('should return valid response', async () => {
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

    it('should deduplicate ids', async () => {
      packagePolicyServiceMock.bulkUpgrade.mockResolvedValue(responseBody);
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '1'],
        },
      });
      await upgradePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
    });

    it('should not look up target policies when disableAgentlessLegacyAPI is disabled', async () => {
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
      expect(packagePolicyServiceMock.getByIDs).not.toHaveBeenCalled();
    });

    describe('when disableAgentlessLegacyAPI is enabled', () => {
      beforeEach(() => {
        appContextService.start(
          createAppContextStartContractMock({}, false, undefined, {
            disableAgentlessLegacyAPI: true,
          })
        );
      });

      it('should reject the whole request when any target package policy is agentless', async () => {
        packagePolicyServiceMock.getByIDs.mockResolvedValue([
          { id: '1', policy_ids: [] },
          { id: '2', policy_ids: [], supports_agentless: true },
        ] as unknown as PackagePolicy[]);

        const request = httpServerMock.createKibanaRequest({
          body: {
            packagePolicyIds: ['1', '2'],
          },
        });

        // Only the offending id is named, so a batch owner can self-remediate.
        await expect(upgradePackagePolicyHandler(context, request, response)).rejects.toThrow(
          /To upgrade managed integrations.*Offending IDs: 2\./
        );
        expect(packagePolicyServiceMock.bulkUpgrade).not.toHaveBeenCalled();
      });

      it('should reject when a target package policy belongs to an agentless agent policy', async () => {
        packagePolicyServiceMock.getByIDs.mockResolvedValue([
          { id: '1', policy_ids: ['agentless-ap'] },
        ] as unknown as PackagePolicy[]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: 'agentless-ap', supports_agentless: true },
        ]);

        const request = httpServerMock.createKibanaRequest({
          body: {
            packagePolicyIds: ['1'],
          },
        });

        await expect(upgradePackagePolicyHandler(context, request, response)).rejects.toThrow(
          /Offending IDs: 1\./
        );
        expect(packagePolicyServiceMock.bulkUpgrade).not.toHaveBeenCalled();
      });

      it('should upgrade regular package policies', async () => {
        packagePolicyServiceMock.getByIDs.mockResolvedValue([
          { id: '1', policy_ids: ['regular-ap'] },
        ] as unknown as PackagePolicy[]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([{ id: 'regular-ap' }]);
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
      });
    });
  });

  describe('dry run upgrade api handler', () => {
    let responseBody: UpgradePackagePolicyDryRunResponse;
    beforeEach(() => {
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
      responseBody = [responseItem, responseItem];

      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseBody[0]);
      packagePolicyServiceMock.getUpgradeDryRunDiff.mockResolvedValueOnce(responseBody[1]);
    });

    it('should return valid response', async () => {
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

    it('should deduplicate ids', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '2', '1', '2'],
        },
      });
      await dryRunUpgradePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
    });

    it('should not look up target policies when disableAgentlessLegacyAPI is disabled', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '2'],
        },
      });
      await dryRunUpgradePackagePolicyHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: responseBody,
      });
      expect(packagePolicyServiceMock.getByIDs).not.toHaveBeenCalled();
    });

    it('should reject agentless package policies when disableAgentlessLegacyAPI is enabled', async () => {
      appContextService.start(
        createAppContextStartContractMock({}, false, undefined, {
          disableAgentlessLegacyAPI: true,
        })
      );
      packagePolicyServiceMock.getByIDs.mockResolvedValue([
        { id: '1', policy_ids: [] },
        { id: '2', policy_ids: [], supports_agentless: true },
      ] as unknown as PackagePolicy[]);

      const request = httpServerMock.createKibanaRequest({
        body: {
          packagePolicyIds: ['1', '2'],
        },
      });

      await expect(dryRunUpgradePackagePolicyHandler(context, request, response)).rejects.toThrow(
        /To upgrade managed integrations/
      );
      expect(packagePolicyServiceMock.getUpgradeDryRunDiff).not.toHaveBeenCalled();
    });
  });
});
