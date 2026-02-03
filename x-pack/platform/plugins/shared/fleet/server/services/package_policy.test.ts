/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  coreMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { produce } from 'immer';
import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import { PackagePolicyMocks } from '../mocks/package_policy.mocks';

import type {
  PackageInfo,
  PackagePolicySOAttributes,
  PostPackagePolicyPostDeleteCallback,
  RegistryDataStream,
  PackagePolicyInputStream,
  PackagePolicy,
  PostPackagePolicyPostCreateCallback,
  PostPackagePolicyDeleteCallback,
  UpdatePackagePolicy,
  AssetsMap,
} from '../types';
import { createPackagePolicyMock } from '../../common/mocks';

import type { PutPackagePolicyUpdateCallback, PostPackagePolicyCreateCallback } from '..';

import {
  createAppContextStartContractMock,
  createSavedObjectClientMock,
  xpackMocks,
} from '../mocks';

import type {
  PostDeletePackagePoliciesResponse,
  InputsOverride,
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackagePolicyPackage,
  DeletePackagePoliciesResponse,
  PackagePolicyAssetsMap,
  PreconfiguredInputs,
  ArchiveEntry,
} from '../../common/types';
import { packageToPackagePolicy, packageToPackagePolicyInputs } from '../../common/services';

import { FleetError, PackagePolicyValidationError, CloudConnectorUpdateError } from '../errors';

import { mapPackagePolicySavedObjectToPackagePolicy } from './package_policies';

import {
  preconfigurePackageInputs,
  updatePackageInputs,
  packagePolicyService,
  _applyIndexPrivileges,
  _compilePackagePolicyInputs,
  _validateRestrictedFieldsNotModifiedOrThrow,
  _normalizePackagePolicyKuery,
  _getAssetForTemplatePath,
} from './package_policy';
import { appContextService } from '.';

import { getPackageInfo } from './epm/packages';
import { sendTelemetryEvents } from './upgrade_sender';
import { auditLoggingService } from './audit_logging';
import { agentPolicyService } from './agent_policy';
import { isSpaceAwarenessEnabled } from './spaces/helpers';
import { licenseService } from './license';
import { cloudConnectorService } from './cloud_connector';
import * as secretsModule from './secrets';

jest.mock('./spaces/helpers', () => {
  return {
    ...jest.requireActual('./spaces/helpers'),
    isSpaceAwarenessEnabled: jest.fn(),
  };
});

jest.mock('./license');

const mockedSendTelemetryEvents = sendTelemetryEvents as jest.MockedFunction<
  typeof sendTelemetryEvents
>;

const ASSETS_MAP_FIXTURES = new Map([
  [
    '/test-1.0.0/data_stream/dataset1/agent/stream/some_template_path.yml',
    Buffer.from(`
  type: log
  metricset: ["dataset1"]
  paths:
  {{#each paths}}
  - {{this}}
  {{/each}}
  {{#if hosts}}
  hosts:
  {{#each hosts}}
  - {{this}}
  {{/each}}
  {{/if}}
  `),
  ],
  [
    '/test-1.0.0/data_stream/dataset1_level1/agent/stream/some_template_path.yml',
    Buffer.from(`
  type: log
  metricset: ["dataset1.level1"]
  `),
  ],
  [
    '/test-1.0.0/agent/input/some_template_path.yml',
    Buffer.from(`
  hosts:
  {{#each hosts}}
  - {{this}}
  {{/each}}
  `),
  ],
]) as PackagePolicyAssetsMap;

async function mockedGetInstallation(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { version: '0.3.3' };
  if (params.pkgName === 'endpoint') pkg = { version: '1.0.0' };
  if (params.pkgName === 'test') pkg = { version: '0.0.1' };
  return Promise.resolve(pkg);
}

async function mockedGetPackageInfo(params: any) {
  let pkg;
  if (params.pkgName === 'apache')
    pkg = {
      version: '1.3.2',
      conditions: {
        agent: {
          version: '>=9.3.0',
        },
      },
    };
  if (params.pkgName === 'aws') {
    pkg = {
      name: 'aws',
      version: '0.3.3',
      policy_templates: [
        {
          name: 'aws',
          inputs: [
            {
              title: 'AWS',
              type: 'aws',
              description: 'AWS input',
              vars: [
                {
                  name: 'role_arn',
                  required: false,
                  type: 'text',
                },
                {
                  name: 'external_id',
                  required: false,
                  secret: true,
                  type: 'password',
                },
              ],
            },
          ],
        },
      ],
      data_streams: [
        {
          dataset: 'test',
          type: 'logs',
          streams: [
            {
              input: 'aws',
              template_path: 'test-template.yml',
            },
          ],
        },
      ],
    };
  }
  if (params.pkgName === 'endpoint') pkg = { name: 'endpoint', version: params.pkgVersion };
  if (params.pkgName === 'test') {
    pkg = {
      name: 'test',
      version: '1.0.2',
    };
  }
  if (params.pkgName === 'test-conflict') {
    pkg = {
      version: '1.0.2',
      policy_templates: [
        {
          name: 'test-conflict',
          inputs: [
            {
              title: 'test',
              type: 'logs',
              description: 'test',
              vars: [
                {
                  name: 'test-var-required',
                  required: true,
                  type: 'integer',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  return Promise.resolve(pkg);
}

jest.mock('./epm/packages', () => {
  return {
    getPackageInfo: jest.fn().mockImplementation(mockedGetPackageInfo),
    getInstallation: mockedGetInstallation,
    ensureInstalledPackage: jest.fn(),
  };
});

jest.mock('../../common/services/package_to_package_policy', () => ({
  ...jest.requireActual('../../common/services/package_to_package_policy'),
  packageToPackagePolicy: jest.fn(),
}));

jest.mock('./epm/registry', () => ({
  getPackage: jest.fn().mockResolvedValue({ assetsMap: [] }),
}));

jest.mock('./epm/packages/get', () => ({
  getPackageAssetsMap: jest.fn().mockResolvedValue(new Map()),
  getAgentTemplateAssetsMap: jest.fn().mockImplementation(async (params) => {
    const assetsMap = new Map();
    // Add mock template data for aws package
    if (params.packageInfo.name === 'aws') {
      assetsMap.set('test-template.yml', {
        buffer: Buffer.from('mock template content'),
        path: 'test-template.yml',
      });
    }
    if (params.packageInfo.name === 'test') {
      assetsMap.set(
        'data_stream/cel.yml.hbs',
        Buffer.from(
          '{{#semverSatisfies _meta.agent.version "^9.3.0"}}mock template content{{/semverSatisfies}}'
        )
      );
    }
    return assetsMap;
  }),
}));

jest.mock('./agent_policy');
const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
jest.mock('./epm/packages/cleanup', () => {
  return {
    removeOldAssets: jest.fn(),
  };
});

jest.mock('./upgrade_sender', () => {
  return {
    sendTelemetryEvents: jest.fn(),
  };
});

jest.mock('./audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

jest.mock('./secrets', () => ({
  isSecretStorageEnabled: jest.fn(),
  toCompiledSecretRef: jest.fn((id: string) => ({
    id,
    isSecretRef: true,
  })),
  extractAndWriteSecrets: jest.fn(),
  deleteSecretsIfNotReferenced: jest.fn(),
}));

const mockedSecretsModule = secretsModule as jest.Mocked<typeof secretsModule>;

type CombinedExternalCallback = PutPackagePolicyUpdateCallback | PostPackagePolicyCreateCallback;

const mockAgentPolicyGet = (spaceIds: string[] = ['default'], additionalProps?: any) => {
  const basePolicy = {
    id: 'agentPolicy1',
    name: 'Test Agent Policy',
    namespace: 'test',
    status: 'active',
    is_managed: false,
    updated_at: new Date().toISOString(),
    updated_by: 'test',
    revision: 1,
    is_protected: false,
    space_ids: spaceIds,
    ...additionalProps,
  };

  mockAgentPolicyService.get.mockImplementation(
    (_soClient: SavedObjectsClientContract, id: string, _force = false, _options) => {
      return Promise.resolve({
        id,
        ...basePolicy,
      });
    }
  );
  mockAgentPolicyService.getByIds.mockImplementation(
    // @ts-ignore
    (_soClient: SavedObjectsClientContract, ids: string[]) => {
      return Promise.resolve(
        ids.map((id) => ({
          id,
          ...basePolicy,
        }))
      );
    }
  );
};

describe('Package policy service', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
      enableVersionSpecificPolicies: true,
    } as any);
  });

  afterEach(() => {
    appContextService.stop();

    // `jest.resetAllMocks` breaks a ton of tests in this file 🤷‍♂️
    mockAgentPolicyService.get.mockReset();
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
  });

  describe('create', () => {
    beforeEach(() => {
      jest.mocked(licenseService.hasAtLeast).mockReturnValue(true);
    });
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();
      const packagePolicySO = {
        id: 'test-package-policy',
        attributes: {
          inputs: [],
        },
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      };

      soClient.create.mockResolvedValueOnce(packagePolicySO);
      soClient.get.mockResolvedValueOnce(packagePolicySO);

      mockAgentPolicyGet();

      await packagePolicyService.create(
        soClient,
        esClient,
        {
          name: 'Test Package Policy',
          namespace: 'test',
          enabled: true,
          policy_id: 'test',
          policy_ids: ['test'],
          inputs: [],
          package: {
            name: 'test',
            title: 'Test',
            version: '0.0.1',
          },
        },
        // Skipping unique name verification just means we have to less mocking/setup
        { id: 'test-package-policy', skipUniqueNameVerification: true }
      );

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toBeCalledWith({
        action: 'create',
        id: 'test-package-policy',
        name: 'Test Package Policy',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });

    it('should not allow to add a reusable integration policies to an agent policies belonging to multiple spaces', async () => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: {},
        references: [],
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      mockAgentPolicyGet(['test', 'default']);

      await expect(
        packagePolicyService.create(
          soClient,
          esClient,
          {
            name: 'Test Package Policy',
            namespace: 'test',
            enabled: true,
            policy_id: 'test',
            policy_ids: ['test1', 'test2'],
            inputs: [],
            package: {
              name: 'test',
              title: 'Test',
              version: '0.0.1',
            },
          },
          // Skipping unique name verification just means we have to less mocking/setup
          { id: 'test-package-policy', skipUniqueNameVerification: true }
        )
      ).rejects.toThrowError(
        /Reusable integration policies cannot be used with agent policies belonging to multiple spaces./
      );
    });

    it('should throw validation error for agentless deployment mode with disallowed inputs', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: {},
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      // Mock an agentless agent policy
      mockAgentPolicyGet(undefined, { supports_agentless: true });

      await expect(
        packagePolicyService.create(
          soClient,
          esClient,
          {
            name: 'Test Package Policy',
            namespace: 'test',
            enabled: true,
            policy_id: 'test',
            policy_ids: ['test'],
            inputs: [
              {
                type: 'tcp', // tcp input is in the blocklist for agentless
                enabled: true,
                streams: [],
              },
            ],
            package: {
              name: 'test',
              title: 'Test',
              version: '0.0.1',
            },
          },
          { id: 'test-package-policy', skipUniqueNameVerification: true }
        )
      ).rejects.toThrowError(/Input tcp in test is not allowed for deployment mode 'agentless'/);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle cloud connector variables when supports_cloud_connector is true', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      const packagePolicyWithCloudConnector = {
        name: 'test-package-policy',
        enabled: true,
        policy_id: 'test',
        policy_ids: ['test'],
        cloud_connector_id: undefined,
        supports_cloud_connector: true,
        package: {
          name: 'aws',
          title: 'AWS',
          version: '0.3.3',
        },
        inputs: [
          {
            type: 'aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      };

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: packagePolicyWithCloudConnector,
        references: [],
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      mockAgentPolicyGet(undefined, {
        supports_agentless: true,
        agentless: {
          cloud_connectors: {
            enabled: true,
          },
        },
      });

      const result = await packagePolicyService.create(
        soClient,
        esClient,
        packagePolicyWithCloudConnector
      );

      expect(result.supports_cloud_connector).toBe(true);
      expect(result.inputs[0].streams[0].vars).toHaveProperty('role_arn');
      expect(result.inputs[0].streams[0].vars).toHaveProperty('external_id');
    });

    it('should not process cloud connector variables and create cloud connector when supports_cloud_connector is false', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      const packagePolicyWithoutCloudConnector = {
        name: 'test-package-policy',
        namespace: 'test',
        enabled: true,
        policy_id: 'test',
        policy_ids: ['test'],
        supports_cloud_connector: false,
        package: {
          name: 'aws',
          title: 'AWS',
          version: '0.3.3',
        },
        inputs: [
          {
            type: 'aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                },
              },
            ],
          },
        ],
      };

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: packagePolicyWithoutCloudConnector,
        references: [],
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      mockAgentPolicyGet(['test', 'default'], {
        supports_agentless: true,
        agentless: {
          cloud_connectors: {
            enabled: false,
          },
        },
      });

      const result = await packagePolicyService.create(
        soClient,
        esClient,
        packagePolicyWithoutCloudConnector
      );

      expect(result.supports_cloud_connector).toBe(false);
    });

    it('should set hasAgentVersionConditions in bumpRevision when package has agent version condition', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: {},
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      mockAgentPolicyGet();

      await packagePolicyService.create(
        soClient,
        esClient,
        {
          name: 'Test Package Policy',
          namespace: 'test',
          enabled: true,
          policy_id: 'test',
          policy_ids: ['test'],
          inputs: [],
          package: {
            name: 'apache',
            title: 'Apache',
            version: '1.3.2',
          },
        },
        // Skipping unique name verification just means we have to less mocking/setup
        { id: 'test-package-policy', skipUniqueNameVerification: true }
      );

      expect(agentPolicyService.bumpRevision).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'test',
        expect.objectContaining({
          hasAgentVersionConditions: true,
        })
      );
    });

    it('should set hasAgentVersionConditions in bumpRevision when package has agent version condition in hbs template', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      const packagePolicySO = {
        id: 'test-package-policy',
        attributes: {
          inputs: [],
        },
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      };
      soClient.create.mockResolvedValueOnce(packagePolicySO);
      soClient.get.mockResolvedValueOnce(packagePolicySO);

      mockAgentPolicyGet();

      await packagePolicyService.create(
        soClient,
        esClient,
        {
          name: 'Test Package Policy',
          namespace: 'test',
          enabled: true,
          policy_id: 'test',
          policy_ids: ['test'],
          inputs: [],
          package: {
            name: 'test',
            title: 'Test',
            version: '0.0.1',
          },
        },
        // Skipping unique name verification just means we have to less mocking/setup
        { id: 'test-package-policy', skipUniqueNameVerification: true }
      );

      expect(agentPolicyService.bumpRevision).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'test',
        expect.objectContaining({
          hasAgentVersionConditions: true,
        })
      );
    });
  });
  describe('createCloudConnectorForPackagePolicy', () => {
    // Mock PackageInfo for input-level storage mode (no package-level vars defined)
    const mockPackageInfo = {
      name: 'test-package',
      title: 'Test Package',
      version: '1.0.0',
      description: 'Test package',
      type: 'integration',
      categories: [],
      conditions: {},
      icons: [],
      assets: {
        kibana: undefined,
        elasticsearch: undefined,
      },
      policy_templates: [],
      data_streams: [],
      owner: { github: 'elastic' },
      screenshots: [],
    } as unknown as PackageInfo;

    it('should create cloud connector when all conditions are met', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock the cloud connector service
      const mockCloudConnector = {
        id: 'cloud-connector-123',
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            type: 'password',
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
          },
        },
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      // Mock the cloudConnectorService.create method
      const originalCreate = cloudConnectorService.create;
      cloudConnectorService.create = jest.fn().mockResolvedValue(mockCloudConnector);

      try {
        const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
          soClient,
          enrichedPackagePolicy,
          agentPolicy,
          mockPackageInfo
        );

        expect(result).toEqual(mockCloudConnector);
        expect(cloudConnectorService.create).toHaveBeenCalledWith(soClient, {
          name: 'aws-cloud-connector: test-package-policy',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
          cloudProvider: 'aws',
        });
      } finally {
        // Restore the original method
        cloudConnectorService.create = originalCreate;
      }
    });

    it('should return undefined when cloud connector setup is not required', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: false, // Not supported
        cloud_connector_id: undefined,
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
        soClient,
        enrichedPackagePolicy,
        agentPolicy,
        mockPackageInfo
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when agentless cloud connectors are disabled', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: false, // Disabled
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock to ensure no service calls are made
      const originalCreate = cloudConnectorService.create;
      const originalUpdate = cloudConnectorService.update;
      const createSpy = jest.fn();
      const updateSpy = jest.fn();
      cloudConnectorService.create = createSpy;
      cloudConnectorService.update = updateSpy;

      try {
        const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
          soClient,
          enrichedPackagePolicy,
          agentPolicy,
          mockPackageInfo
        );

        expect(result).toBeUndefined();
        // Should not call create or update when cloud connectors are disabled
        expect(createSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(soClient.get).not.toHaveBeenCalled();
      } finally {
        // Restore original methods
        cloudConnectorService.create = originalCreate;
        cloudConnectorService.update = originalUpdate;
      }
    });

    it('should return undefined when agentless configuration is missing', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        // Missing agentless configuration completely
      } as any;

      const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
        soClient,
        enrichedPackagePolicy,
        agentPolicy,
        mockPackageInfo
      );

      expect(result).toBeUndefined();
    });

    it('should update existing cloud connector when cloud_connector_id is provided', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: 'existing-connector-id',
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/UpdatedRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'UPDATEDEXTERNALID123',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock updated cloud connector response
      const updatedCloudConnector = {
        id: 'existing-connector-id',
        name: 'existing-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/UpdatedRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'UPDATEDEXTERNALID123',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      // Mock the cloudConnectorService.update method
      const originalUpdate = cloudConnectorService.update;
      cloudConnectorService.update = jest.fn().mockResolvedValue(updatedCloudConnector);

      try {
        const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
          soClient,
          enrichedPackagePolicy,
          agentPolicy,
          mockPackageInfo
        );

        expect(result).toEqual(updatedCloudConnector);
        expect(cloudConnectorService.update).toHaveBeenCalledWith(
          soClient,
          'existing-connector-id',
          {
            vars: {
              role_arn: {
                value: 'arn:aws:iam::123456789012:role/UpdatedRole',
                type: 'text',
              },
              external_id: {
                value: {
                  id: 'UPDATEDEXTERNALID123',
                  isSecretRef: true,
                },
                type: 'password',
              },
            },
          }
        );
      } finally {
        // Restore the original method
        cloudConnectorService.update = originalUpdate;
      }
    });

    it('should throw CloudConnectorUpdateError when cloud connector update fails', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: 'existing-connector-id',
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/UpdatedRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'UPDATEDEXTERNALID123',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock the cloudConnectorService.update method to throw an error
      const originalUpdate = cloudConnectorService.update;
      cloudConnectorService.update = jest
        .fn()
        .mockRejectedValue(new Error('Cloud connector update failed'));

      try {
        await expect(
          (packagePolicyService as any).createCloudConnectorForPackagePolicy(
            soClient,
            enrichedPackagePolicy,
            agentPolicy,
            mockPackageInfo
          )
        ).rejects.toThrow(CloudConnectorUpdateError);

        // Verify that update was called
        expect(cloudConnectorService.update).toHaveBeenCalledWith(
          soClient,
          'existing-connector-id',
          expect.objectContaining({
            vars: expect.any(Object),
          })
        );
      } finally {
        // Restore the original method
        cloudConnectorService.update = originalUpdate;
      }
    });

    it('should not update cloud connector when cloud_connector_id is provided but no cloud connector vars found', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: 'existing-connector-id',
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {}, // No cloud connector variables
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
        soClient,
        enrichedPackagePolicy,
        agentPolicy,
        mockPackageInfo
      );

      expect(result).toBeUndefined();
      // Should not call get or update when no vars are found
      expect(soClient.get).not.toHaveBeenCalled();
    });

    it('should not update cloud connector when supports_cloud_connector is false even with cloud_connector_id', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: false, // Not supported
        cloud_connector_id: 'existing-connector-id',
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
        soClient,
        enrichedPackagePolicy,
        agentPolicy,
        mockPackageInfo
      );

      expect(result).toBeUndefined();
      // Should not call get or update when supports_cloud_connector is false
      expect(soClient.get).not.toHaveBeenCalled();
    });

    it('should return undefined when no cloud connector variables are found', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {}, // No cloud connector variables
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
        soClient,
        enrichedPackagePolicy,
        agentPolicy,
        mockPackageInfo
      );

      expect(result).toBeUndefined();
    });

    it('should throw error when cloud connector creation fails', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-package-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock the cloudConnectorService.create method to throw an error
      const originalCreate = cloudConnectorService.create;
      cloudConnectorService.create = jest
        .fn()
        .mockRejectedValue(new Error('Cloud connector creation failed'));

      try {
        await expect(
          (packagePolicyService as any).createCloudConnectorForPackagePolicy(
            soClient,
            enrichedPackagePolicy,
            agentPolicy,
            mockPackageInfo
          )
        ).rejects.toThrow(
          'Error creating cloud connector in Fleet, Cloud connector creation failed'
        );
      } finally {
        // Restore the original method
        cloudConnectorService.create = originalCreate;
      }
    });

    it('should create cloud connector with generated name when no cloud_connector_name is provided', async () => {
      const soClient = createSavedObjectClientMock();
      const enrichedPackagePolicy = {
        name: 'test-cspm-policy',
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
        inputs: [
          {
            type: 'cis_aws',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'test', type: 'logs' },
                vars: {
                  role_arn: {
                    value: 'arn:aws:iam::123456789012:role/TestRole',
                    type: 'text',
                  },
                  external_id: {
                    value: {
                      id: 'ABCDEFGHIJKLMNOPQRST',
                      isSecretRef: true,
                    },
                    type: 'password',
                  },
                  // Note: no cloud_connector_name provided
                },
              },
            ],
          },
        ],
      } as any;

      const agentPolicy = {
        id: 'test',
        agentless: {
          cloud_connectors: {
            enabled: true,
            target_csp: 'aws',
          },
        },
      } as any;

      // Mock the cloud connector service
      const mockCloudConnector = {
        id: 'cloud-connector-generated-id',
        name: 'aws-cloud-connector: test-cspm-policy',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            type: 'password',
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
          },
        },
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      // Mock the cloudConnectorService.create method
      const originalCreate = cloudConnectorService.create;
      cloudConnectorService.create = jest.fn().mockResolvedValue(mockCloudConnector);

      try {
        const result = await (packagePolicyService as any).createCloudConnectorForPackagePolicy(
          soClient,
          enrichedPackagePolicy,
          agentPolicy,
          mockPackageInfo
        );

        expect(result).toEqual(mockCloudConnector);
        expect(cloudConnectorService.create).toHaveBeenCalledWith(soClient, {
          name: 'aws-cloud-connector: test-cspm-policy',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
          cloudProvider: 'aws',
        });

        // Verify the name was auto-generated with the correct format
        expect(mockCloudConnector.name).toBe('aws-cloud-connector: test-cspm-policy');
      } finally {
        // Restore the original method
        cloudConnectorService.create = originalCreate;
      }
    });
  });
  describe('inspect', () => {
    it('should return compiled inputs', async () => {
      const soClient = createSavedObjectClientMock();

      soClient.create.mockResolvedValueOnce({
        id: 'test-package-policy',
        attributes: {},
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      mockAgentPolicyGet();

      const policyResult = await packagePolicyService.inspect(
        soClient,
        {
          id: 'b684f590-feeb-11ed-b202-b7f403f1dee9',
          name: 'Test Package Policy',
          namespace: 'test',
          enabled: true,
          policy_id: 'test',
          policy_ids: ['test'],
          inputs: [],
          package: {
            name: 'test',
            title: 'Test',
            version: '0.0.1',
          },
        }
        // Skipping unique name verification just means we have to less mocking/setup
      );

      expect(policyResult).toEqual({
        elasticsearch: undefined,
        enabled: true,
        inputs: [],
        name: 'Test Package Policy',
        namespace: 'test',
        package: {
          name: 'test',
          title: 'Test',
          version: '0.0.1',
        },
        policy_id: 'test',
        policy_ids: ['test'],
        id: 'b684f590-feeb-11ed-b202-b7f403f1dee9',
      });
    });
  });

  describe('bulkCreate', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = createSavedObjectClientMock();

      soClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'test-package-policy-1',
            attributes: {
              package: {
                name: 'test',
                title: 'Test',
                version: '0.0.1',
              },
              inputs: [],
            },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
          {
            id: 'test-package-policy-2',
            attributes: {
              package: {
                name: 'test',
                title: 'Test',
                version: '0.0.1',
              },
              inputs: [],
            },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });
      soClient.get.mockImplementation(async (_, id) => ({
        id,
        attributes: {
          inputs: [],
        },
        references: [],
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      }));

      mockAgentPolicyGet();

      await packagePolicyService.bulkCreate(soClient, esClient, [
        {
          id: 'test-package-policy-1',
          name: 'Test Package Policy 1',
          namespace: 'test',
          enabled: true,
          policy_id: 'test_agent_policy',
          policy_ids: ['test_agent_policy'],
          inputs: [],
          package: {
            name: 'test',
            title: 'Test',
            version: '0.0.1',
          },
        },
        {
          id: 'test-package-policy-2',
          name: 'Test Package Policy 2',
          namespace: 'test',
          enabled: true,
          policy_id: 'test_agent_policy',
          policy_ids: ['test_agent_policy'],
          inputs: [],
          package: {
            name: 'test',
            title: 'Test',
            version: '0.0.1',
          },
        },
      ]);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
        action: 'create',
        id: 'test-package-policy-1',
        name: 'Test Package Policy 1',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
        action: 'create',
        id: 'test-package-policy-2',
        name: 'Test Package Policy 2',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('get', () => {
    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'test-package-policy',
            attributes: { name: 'Test' },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });

      await packagePolicyService.get(soClient, 'test-package-policy');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toBeCalledWith({
        action: 'get',
        id: 'test-package-policy',
        name: 'Test',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('getByIDs', () => {
    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'test-package-policy-1',
            attributes: { name: 'Test 1' },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
          {
            id: 'test-package-policy-2',
            attributes: { name: 'Test 2' },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });

      await packagePolicyService.getByIDs(soClient, [
        'test-package-policy-1',
        'test-package-policy-2',
      ]);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
        action: 'get',
        name: 'Test 1',
        id: 'test-package-policy-1',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
        action: 'get',
        name: 'Test 2',
        id: 'test-package-policy-2',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('list', () => {
    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      soClient.find.mockResolvedValueOnce({
        total: 1,
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            id: 'test-package-policy-1',
            attributes: { name: 'Test 1' },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            score: 0,
          },
          {
            id: 'test-package-policy-2',
            attributes: { name: 'Test 2' },
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            score: 0,
          },
        ],
      });

      await packagePolicyService.list(soClient, {
        page: 1,
        perPage: 1,
        kuery: '',
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
        action: 'find',
        name: 'Test 1',
        id: 'test-package-policy-1',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
        action: 'find',
        name: 'Test 2',
        id: 'test-package-policy-2',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('_compilePackagePolicyInputs', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [
            {
              type: 'logs',
              dataset: 'package.dataset1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
                vars: {
                  paths: {
                    value: ['/var/log/set.log'],
                  },
                },
              },
            ],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              vars: {
                paths: {
                  value: ['/var/log/set.log'],
                },
              },
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with a two level dataset name', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [
            {
              type: 'logs',
              dataset: 'package.dataset1.level1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1_level1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1.level1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1.level1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1.level1'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with config variables at the input level', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with config variables at the package level', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {
          hosts: {
            value: ['localhost'],
          },
        },
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
                hosts: ['localhost'],
              },
            },
          ],
        },
      ]);
    });

    it('should work with an input with a template and no streams', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [],
          policy_templates: [
            {
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
            },
            streams: [],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [],
        },
      ]);
    });

    it('should work with an input with a template and streams', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              name: 'template_1',
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
            {
              name: 'template_2',
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            policy_template: 'template_1',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
          {
            type: 'log',
            policy_template: 'template_2',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
            },
            streams: [],
          },
        ],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          policy_template: 'template_1',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                hosts: ['localhost'],
                type: 'log',
              },
            },
          ],
        },
        {
          type: 'log',
          policy_template: 'template_2',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [],
        },
      ]);
    });

    it('should work with a package without input', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          policy_templates: [
            {
              inputs: undefined,
            },
          ],
        } as unknown as PackageInfo,
        {},
        [],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([]);
    });

    it('should work with a package with a empty inputs array', async () => {
      const inputs = await _compilePackagePolicyInputs(
        {
          name: 'test',
          version: '1.0.0',
          policy_templates: [
            {
              inputs: [],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [],
        ASSETS_MAP_FIXTURES
      );

      expect(inputs).toEqual([]);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockAgentPolicyGet();
    });
    it('should fail to update on version conflict', async () => {
      const savedObjectsClient = createSavedObjectClientMock();

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: createPackagePolicyMock(),
          },
        ],
      });
      savedObjectsClient.update.mockImplementation(
        async (
          _type: string,
          _id: string
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          throw SavedObjectsErrorHelpers.createConflictError('abc', '123');
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await expect(
        packagePolicyService.update(
          savedObjectsClient,
          elasticsearchClient,
          'the-package-policy-id',
          createPackagePolicyMock()
        )
      ).rejects.toThrow('Saved object [abc/123] conflict');
    });

    it('should fail to update if the name already exists on another policy', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 1,
        page: 1,
        saved_objects: [
          {
            id: 'existing-package-policy',
            type: 'ingest-package-policies',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: {
              name: 'endpoint-1',
              description: '',
              namespace: 'default',
              enabled: true,
              policy_id: 'policy-id-1',
              package: {
                name: 'endpoint',
                title: 'Elastic Endpoint',
                version: '0.9.0',
              },
              inputs: [],
            },
          },
        ],
      });
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'the-package-policy-id',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: {},
          },
        ],
      });
      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'the-package-policy-id',
                type,
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await expect(
        packagePolicyService.update(
          savedObjectsClient,
          elasticsearchClient,
          'the-package-policy-id',
          {
            name: 'endpoint-1',
            description: '',
            namespace: 'default',
            enabled: true,
            policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
            policy_ids: ['93c46720-c217-11ea-9906-b5b8a21b268e'],
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.9.0',
            },
            inputs: [],
          }
        )
      ).rejects.toThrow(
        'An integration policy with the name endpoint-1 already exists. Please rename it or choose a different name.'
      );
    });

    it('should not fail to update if skipUniqueNameVerification when the name already exists on another policy', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 1,
        page: 1,
        saved_objects: [
          {
            id: 'existing-package-policy',
            type: 'ingest-package-policies',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: {
              name: 'endpoint-1',
              description: '',
              namespace: 'default',
              enabled: true,
              policy_id: 'policy-id-1',
              package: {
                name: 'endpoint',
                title: 'Elastic Endpoint',
                version: '0.9.0',
              },
              inputs: [],
            },
          },
        ],
      });
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'the-package-policy-id',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: {},
          },
        ],
      });
      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'the-package-policy-id',
                type,
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        {
          name: 'endpoint-1',
          description: '',
          namespace: 'default',
          enabled: true,
          policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
          policy_ids: ['93c46720-c217-11ea-9906-b5b8a21b268e'],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
          inputs: [],
        },
        { skipUniqueNameVerification: true }
      );
      expect(result.name).toEqual('endpoint-1');
    });

    it('should not fail to update if skipUniqueNameVerification: false when the name is not updated but duplicates exists', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 1,
        page: 1,
        saved_objects: [
          {
            id: 'existing-package-policy',
            type: 'ingest-package-policies',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: {
              name: 'endpoint-1',
              description: '',
              namespace: 'default',
              enabled: true,
              policy_id: 'policy-id-1',
              package: {
                name: 'endpoint',
                title: 'Elastic Endpoint',
                version: '0.9.0',
              },
              inputs: [],
            },
          },
        ],
      });
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'the-package-policy-id',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: {
              name: 'endpoint-1',
            },
          },
        ],
      });
      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'the-package-policy-id',
                type,
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        {
          name: 'endpoint-1',
          description: '',
          namespace: 'default',
          enabled: true,
          policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
          policy_ids: ['93c46720-c217-11ea-9906-b5b8a21b268e'],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
          inputs: [],
        },
        { skipUniqueNameVerification: false }
      );
      expect(result.name).toEqual('endpoint-1');
    });

    it('should throw if the user try to update input vars that are frozen', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'test',
                type: 'abcd',
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const res = packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate }
      );

      await expect(res).rejects.toThrow('cat is a frozen variable and cannot be modified');
    });

    it('should allow to update input vars that are frozen with the force flag', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'test',
                type: 'abcd',
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate },
        { force: true }
      );

      const [modifiedInput] = result.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('tabby');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['east', 'west']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });
    it('should add new input vars when updating', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'siamese',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'test',
                type: 'abcd',
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate }
      );

      const [modifiedInput] = result.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('siamese');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['north', 'south']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });

    it('should update elasticsearch.priviles.cluster when updating', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };
      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'test',
                type: 'abcd',
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: [] }
      );

      expect(result.elasticsearch).toMatchObject({ privileges: { cluster: ['monitor'] } });
    });

    it('should not mutate packagePolicyUpdate object when trimming whitespace', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: [
              {
                id: 'test',
                type: 'abcd',
                references: [],
                version: 'test',
                attributes: attrs,
              },
            ],
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        // this mimics the way that OSQuery plugin create immutable objects
        produce<PackagePolicy>(
          { ...mockPackagePolicy, name: '  test  ', inputs: [] },
          (draft) => draft
        )
      );

      expect(result.name).toEqual('test');
    });

    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test-package-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            attributes,
          },
        ],
      });

      soClient.update.mockResolvedValue({
        id: 'test-package-policy',
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        attributes,
      });

      await packagePolicyService.update(soClient, esClient, 'test-package-policy', {
        ...mockPackagePolicy,
        inputs: [],
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'update',
        name: 'endpoint-1',
        id: 'test-package-policy',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });

    it('should run "packagePolicyPostUpdate" external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const mockPackagePolicy = createPackagePolicyMock();
      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };

      jest.spyOn(appContextService, 'getExternalCallbacks');

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test-package-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            attributes,
          },
        ],
      });

      soClient.update.mockResolvedValue({
        id: 'test-package-policy',
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        attributes,
      });

      await packagePolicyService.update(soClient, esClient, 'test-package-policy', {
        ...mockPackagePolicy,
        inputs: [],
      });

      expect(appContextService.getExternalCallbacks).toHaveBeenCalledWith(
        'packagePolicyPostUpdate'
      );
    });

    describe('remove protections', () => {
      beforeEach(() => {
        mockAgentPolicyService.bumpRevision.mockReset();
      });

      const generateAttributes = (overrides: Record<string, unknown> = {}) => ({
        name: 'endpoint-12',
        description: '',
        namespace: 'default',
        enabled: true,
        policy_ids: ['test'],
        package: {
          name: 'endpoint',
          title: 'Elastic Endpoint',
          version: '0.9.0',
        },
        inputs: [],
        ...overrides,
      });

      const generateSO = (overrides: Record<string, unknown> = {}) => ({
        id: 'existing-package-policy',
        type: 'ingest-package-policies',
        references: [],
        version: '1.0.0',
        attributes: generateAttributes(overrides),
      });

      const testedPolicyIds = ['test-agent-policy-1', 'test-agent-policy-2', 'test-agent-policy-3'];

      const setupSOClientMocks = (
        savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>,
        initialPolicies: string[],
        updatesPolicies: string[],
        overrides: Record<string, unknown> = {}
      ) => {
        savedObjectsClient.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            generateSO({ name: 'test-package-policy', policy_ids: initialPolicies, ...overrides }),
          ],
        });
        savedObjectsClient.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            generateSO({
              name: 'test-package-policy-1',
              policy_ids: updatesPolicies,
              ...overrides,
            }),
          ],
        });
        savedObjectsClient.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            generateSO({
              name: 'test-package-policy-1',
              policy_ids: updatesPolicies,
              ...overrides,
            }),
          ],
        });
      };

      const callPackagePolicyServiceUpdate = async (
        savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>,
        elasticsearchClient: ElasticsearchClientMock,
        policyIds: string[]
      ) => {
        await packagePolicyService.update(
          savedObjectsClient,
          elasticsearchClient,
          generateSO().id,
          generateAttributes({
            policy_ids: policyIds,
            name: 'test-package-policy-1',
          })
        );
      };

      it('should not remove protections if policy_ids is not changed', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        setupSOClientMocks(savedObjectsClient, testedPolicyIds, testedPolicyIds);

        await callPackagePolicyServiceUpdate(
          savedObjectsClient,
          elasticsearchClient,
          testedPolicyIds
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(testedPolicyIds.length);
        Array.from({ length: testedPolicyIds.length }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: false })
          );
        });
      });

      it('should remove protections if policy_ids is changed, only affected policies', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        const updatedPolicyIds = [...testedPolicyIds].splice(1, 2);

        setupSOClientMocks(savedObjectsClient, testedPolicyIds, updatedPolicyIds);

        await callPackagePolicyServiceUpdate(
          savedObjectsClient,
          elasticsearchClient,
          updatedPolicyIds
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(testedPolicyIds.length);
        Array.from({ length: testedPolicyIds.length }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: index === 1 })
          );
        });
      });

      it('should remove protections from all agent policies if updated policy_ids is empty', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        setupSOClientMocks(savedObjectsClient, testedPolicyIds, []);

        await callPackagePolicyServiceUpdate(savedObjectsClient, elasticsearchClient, []);

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(testedPolicyIds.length);
        Array.from({ length: testedPolicyIds.length }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: true })
          );
        });
      });

      it('should set protections to false on new policy assignment', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        const updatedPolicyIds = [...testedPolicyIds, 'test-agent-policy-4'];

        setupSOClientMocks(savedObjectsClient, testedPolicyIds, updatedPolicyIds);

        await callPackagePolicyServiceUpdate(
          savedObjectsClient,
          elasticsearchClient,
          updatedPolicyIds
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(updatedPolicyIds.length);
        Array.from({ length: testedPolicyIds.length }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: index === 4 }) // Only the last policy should have removeProtection set to true since it's new
          );
        });
      });

      it('should set protections to false on all new policy assignment', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        setupSOClientMocks(savedObjectsClient, [], testedPolicyIds);

        await callPackagePolicyServiceUpdate(savedObjectsClient, elasticsearchClient, []);

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(testedPolicyIds.length);
        Array.from({ length: testedPolicyIds.length }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: true })
          );
        });
      });

      it('should never remove protections for non-endpoint packages, regardless of policy_ids change', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
        const testPolicyIds = ['test-agent-policy-1', 'test-agent-policy-2'];

        // Ensure both old and new policies are NOT endpoint
        setupSOClientMocks(
          savedObjectsClient,
          testPolicyIds,
          [],
          // Add package override for both old and new policies
          { package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' } }
        );

        await packagePolicyService.update(
          savedObjectsClient,
          elasticsearchClient,
          generateSO({
            package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
          }).id,
          generateAttributes({
            policy_ids: [],
            name: 'test-package-policy-1',
            package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
          })
        );

        const calls = mockAgentPolicyService.bumpRevision.mock.calls;
        expect(calls).toHaveLength(testPolicyIds.length);

        calls.forEach((call, idx) => {
          expect(call[2]).toContain(`test-agent-policy-${idx + 1}`);
          expect(call[3]).toMatchObject({ removeProtection: undefined });
        });
      });

      it('should throw validation error for agentless deployment mode with disallowed inputs', async () => {
        const savedObjectsClient = createSavedObjectClientMock();
        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        // Mock existing package policy
        savedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [
            {
              id: 'test',
              type: 'abcd',
              references: [],
              version: 'test',
              attributes: createPackagePolicyMock(),
            },
          ],
        });

        // Mock agentless agent policy
        mockAgentPolicyGet(undefined, { supports_agentless: true });

        await expect(
          packagePolicyService.update(
            savedObjectsClient,
            elasticsearchClient,
            'the-package-policy-id',
            {
              name: 'test-policy',
              description: '',
              namespace: 'default',
              enabled: true,
              policy_id: 'test',
              policy_ids: ['test'],
              inputs: [
                {
                  type: 'tcp', // tcp input is in the blocklist for agentless
                  enabled: true,
                  streams: [],
                },
              ],
              package: {
                name: 'test',
                title: 'Test',
                version: '0.0.1',
              },
            }
          )
        ).rejects.toThrowError(/Input tcp in test is not allowed for deployment mode 'agentless'/);
      });
    });
  });

  describe('bulkUpdate', () => {
    beforeEach(() => {
      mockedSendTelemetryEvents.mockReset();
    });

    it('should throw if the user try to update input vars that are frozen', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );

      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const toUpdate = { ...mockPackagePolicy, inputs: inputsUpdate };

      const res = await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,

        [toUpdate]
      );

      expect(res.failedPolicies).toHaveLength(1);
      expect(res.updatedPolicies).toHaveLength(0);
      expect(res.failedPolicies[0].packagePolicy).toEqual(toUpdate);
      expect(res.failedPolicies[0].error).toEqual(
        new PackagePolicyValidationError(`cat is a frozen variable and cannot be modified`)
      );
    });

    it('should allow to update input vars that are frozen with the force flag', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        [{ ...mockPackagePolicy, inputs: inputsUpdate }],
        { force: true }
      );

      expect(result.updatedPolicies).toHaveLength(1);

      const updatedPolicy = result.updatedPolicies?.[0]!;

      const [modifiedInput] = updatedPolicy.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('tabby');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['east', 'west']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });

    it('should add new input vars when updating', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'siamese',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );

      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        [{ ...mockPackagePolicy, inputs: inputsUpdate }]
      );

      expect(result.updatedPolicies).toHaveLength(1);

      const updatedPolicy = result.updatedPolicies?.[0]!;

      const [modifiedInput] = updatedPolicy.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('siamese');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['north', 'south']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });

    it('should update elasticsearch.privileges.cluster when updating', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };
      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );

      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const { updatedPolicies } = await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        [{ ...mockPackagePolicy, inputs: [] }]
      );

      expect(updatedPolicies![0].elasticsearch).toMatchObject({
        privileges: { cluster: ['monitor'] },
      });
    });

    it('should not mutate packagePolicyUpdate object when trimming whitespace', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );

      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const { updatedPolicies } = await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        // this mimics the way that OSQuery plugin create immutable objects
        [
          produce<PackagePolicy>(
            { ...mockPackagePolicy, name: '  test  ', inputs: [] },
            (draft) => draft
          ),
        ]
      );

      expect(updatedPolicies![0].name).toEqual('test');
    });

    it('should send telemetry event when upgrading a package policy', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];

      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        [
          {
            ...mockPackagePolicy,
            package: { ...mockPackagePolicy!.package, version: '0.9.1' },
          } as any,
        ],
        { force: true }
      );

      expect(mockedSendTelemetryEvents).toBeCalled();
    });

    it('should not send telemetry event when updating a package policy without upgrade', async () => {
      const savedObjectsClient = createSavedObjectClientMock();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];

      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes,
          },
        ],
      });

      savedObjectsClient.bulkUpdate.mockImplementation(
        async (
          objs: Array<{
            type: string;
            id: string;
            attributes: any;
          }>
        ) => {
          const newObjs = objs.map((obj) => ({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: obj.attributes,
          }));
          savedObjectsClient.bulkGet.mockResolvedValue({
            saved_objects: newObjs,
          });
          return {
            saved_objects: newObjs,
          };
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await packagePolicyService.bulkUpdate(
        savedObjectsClient,
        elasticsearchClient,
        [
          {
            ...mockPackagePolicy,
          } as any,
        ],
        { force: true }
      );

      expect(mockedSendTelemetryEvents).not.toBeCalled();
    });

    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const mockPackagePolicies = [
        {
          id: 'test-package-policy-1',
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: createPackagePolicyMock(),
          references: [],
        },
        {
          id: 'test-package-policy-2',
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: createPackagePolicyMock(),
          references: [],
        },
      ];

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [...mockPackagePolicies],
      });

      soClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [...mockPackagePolicies],
      });

      await packagePolicyService.bulkUpdate(soClient, esClient, [
        {
          id: 'test-package-policy-1',
          name: 'Test Package Policy 1',
          namespace: 'test',
          enabled: true,
          policy_id: 'test-agent-policy',
          policy_ids: ['test-agent-policy'],
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
        },
        {
          id: 'test-package-policy-2',
          name: 'Test Package Policy 2',
          namespace: 'test',
          enabled: true,
          policy_id: 'test-agent-policy',
          policy_ids: ['test-agent-policy'],
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
        },
      ]);
    });

    it('should call external callbacks', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const callbackOne = jest.fn().mockImplementation((p) => p);
      appContextService.addExternalCallback('packagePolicyPostUpdate', callbackOne);
      const callbackTwo = jest.fn().mockImplementation((p) => p);
      appContextService.addExternalCallback('packagePolicyPostUpdate', callbackTwo);
      const mockPackagePolicies = [
        {
          id: 'test-package-policy-1',
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: createPackagePolicyMock(),
          references: [],
        },
        {
          id: 'test-package-policy-2',
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          attributes: createPackagePolicyMock(),
          references: [],
        },
      ];

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [...mockPackagePolicies],
      });
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [...mockPackagePolicies],
      });

      soClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [...mockPackagePolicies],
      });

      await packagePolicyService.bulkUpdate(soClient, esClient, [
        {
          id: 'test-package-policy-1',
          name: 'Test Package Policy 1',
          namespace: 'test',
          enabled: true,
          policy_id: 'test-agent-policy',
          policy_ids: ['test-agent-policy'],
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
        },
        {
          id: 'test-package-policy-2',
          name: 'Test Package Policy 2',
          namespace: 'test',
          enabled: true,
          policy_id: 'test-agent-policy',
          policy_ids: ['test-agent-policy'],
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.9.0',
          },
        },
      ]);

      expect(callbackOne).toBeCalledTimes(2);
      expect(callbackTwo).toBeCalledTimes(2);
    });

    describe('remove protections', () => {
      beforeEach(() => {
        mockAgentPolicyService.bumpRevision.mockReset();
      });
      const generateAttributes = (overrides: Record<string, unknown> = {}) => ({
        name: 'endpoint-12',
        description: '',
        namespace: 'default',
        enabled: true,
        policy_ids: ['test'],
        package: {
          name: 'endpoint',
          title: 'Elastic Endpoint',
          version: '0.9.0',
        },
        inputs: [],
        ...overrides,
      });

      const generateSO = (overrides: Record<string, unknown> = {}) => ({
        id: 'existing-package-policy',
        type: 'ingest-package-policies',
        references: [],
        version: '1.0.0',
        attributes: generateAttributes(overrides),
        ...(overrides.id ? ({ id: overrides.id } as { id: string }) : {}),
      });

      const packagePoliciesSO = [
        generateSO({
          name: 'test-package-policy',
          policy_ids: ['test-agent-policy-1', 'test-agent-policy-2', 'test-agent-policy-3'],
          id: 'asdb',
        }),
        generateSO({
          name: 'test-package-policy-1',
          policy_ids: ['test-agent-policy-4', 'test-agent-policy-5', 'test-agent-policy-6'],
          id: 'asdb1',
        }),
      ];
      const testedPackagePolicies = packagePoliciesSO.map((so) => so.attributes);

      const totalPolicyIds = packagePoliciesSO.reduce(
        (count, policy) => count + policy.attributes.policy_ids.length,
        0
      );

      const setupSOClientMocks = (
        savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>,
        overrideReturnedSOs?: typeof packagePoliciesSO
      ) => {
        savedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: overrideReturnedSOs || packagePoliciesSO,
        });

        savedObjectsClient.bulkUpdate.mockImplementation(
          async (
            objs: Array<{
              type: string;
              id: string;
              attributes: any;
            }>
          ) => {
            const newObjs = objs.map((obj) => ({
              id: 'test',
              type: 'abcd',
              references: [],
              version: 'test',
              attributes: obj.attributes,
            }));

            savedObjectsClient.bulkGet.mockResolvedValue({
              saved_objects: newObjs,
            });
            return {
              saved_objects: newObjs,
            };
          }
        );
      };

      const callPackagePolicyServiceBulkUpdate = async (
        savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>,
        elasticsearchClient: ElasticsearchClientMock,
        packagePolicies: UpdatePackagePolicy[]
      ) => {
        await packagePolicyService.bulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          packagePolicies,
          { force: true }
        );
      };

      it('should not remove protections if policy_ids is not changed', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        setupSOClientMocks(savedObjectsClient);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          testedPackagePolicies
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(totalPolicyIds);

        Array.from({ length: totalPolicyIds }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: false })
          );
        });
      });

      it('should remove protections if policy_ids is changed, only affected policies', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        setupSOClientMocks(savedObjectsClient);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        const packagePoliciesWithIncompletePolicyIds = testedPackagePolicies.map((policy) => ({
          ...policy,
          policy_ids: [...policy.policy_ids].splice(1, 2),
        }));

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          packagePoliciesWithIncompletePolicyIds
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(totalPolicyIds);

        Array.from({ length: totalPolicyIds }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledWith(
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: index === 1 || index === 4 })
          );
        });
      });

      it('should remove protections from all agent policies if updated policy_ids is empty', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        setupSOClientMocks(savedObjectsClient);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        const packagePoliciesWithEmptyPolicyIds = testedPackagePolicies.map((policy) => ({
          ...policy,
          policy_ids: [],
        }));

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          packagePoliciesWithEmptyPolicyIds
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(totalPolicyIds);

        Array.from({ length: totalPolicyIds }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: true })
          );
        });
      });

      it('should remove protections from all newly assigned policies', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        setupSOClientMocks(savedObjectsClient, [
          generateSO({
            name: 'test-package-policy',
            policy_ids: ['test-agent-policy-1'],
            id: 'asdb',
          }),
          generateSO({
            name: 'test-package-policy-1',
            policy_ids: [],
            id: 'asdb1',
          }),
        ]);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          testedPackagePolicies
        );

        expect(mockAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(totalPolicyIds);

        Array.from({ length: totalPolicyIds }, (_, index) => index + 1).forEach((index) => {
          expect(mockAgentPolicyService.bumpRevision).toHaveBeenNthCalledWith(
            index,
            savedObjectsClient,
            elasticsearchClient,
            expect.stringContaining(`test-agent-policy-${index}`),
            expect.objectContaining({ removeProtection: index !== 1 }) // First policy should not have protection removed since it was already assigned
          );
        });
      });
      it('should never remove protections for non-endpoint packages, regardless of policy_ids change', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        // All non-endpoint policies
        const nonEndpointPoliciesSO = [
          generateSO({
            name: 'not-endpoint-policy',
            policy_ids: ['test-agent-policy-1'],
            id: 'not-endpoint-1',
            package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
          }),
          generateSO({
            name: 'not-endpoint-policy-2',
            policy_ids: ['test-agent-policy-2'],
            id: 'not-endpoint-2',
            package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
          }),
        ];

        const nonEndpointTestedPolicies = nonEndpointPoliciesSO.map((so) => so.attributes);

        setupSOClientMocks(savedObjectsClient, nonEndpointPoliciesSO);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          nonEndpointTestedPolicies
        );

        const calls = mockAgentPolicyService.bumpRevision.mock.calls;
        expect(calls).toHaveLength(2);
        calls.forEach((call, idx) => {
          expect(call[2]).toContain(`test-agent-policy-${idx + 1}`);
          expect(call[3]).toMatchObject({ removeProtection: false });
        });
      });

      it('should only set removeProtection for endpoint package in a mixed bulkUpdate', async () => {
        const savedObjectsClient = createSavedObjectClientMock();

        const mixedPoliciesSO = [
          generateSO({
            name: 'endpoint-policy',
            policy_ids: ['test-agent-policy-1'],
            id: 'endpoint-1',
            package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.9.0' },
          }),
          generateSO({
            name: 'not-endpoint-policy',
            policy_ids: ['test-agent-policy-2'],
            id: 'not-endpoint-1',
            package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
          }),
        ];
        const mixedTestedPolicies = [
          { ...mixedPoliciesSO[0].attributes, policy_ids: [] }, // endpoint policy IDs removed
          { ...mixedPoliciesSO[1].attributes, policy_ids: ['test-agent-policy-2'] }, // not-endpoint unchanged
        ];

        setupSOClientMocks(savedObjectsClient, mixedPoliciesSO);

        const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        await callPackagePolicyServiceBulkUpdate(
          savedObjectsClient,
          elasticsearchClient,
          mixedTestedPolicies
        );

        const calls = mockAgentPolicyService.bumpRevision.mock.calls;
        expect(calls).toHaveLength(2);

        // Find by id, not by order
        const endpointCall = calls.find((call) => call[2] === 'test-agent-policy-1');
        const nonEndpointCall = calls.find((call) => call[2] === 'test-agent-policy-2');

        expect(endpointCall?.[3]).toMatchObject({ removeProtection: true });
        expect(nonEndpointCall?.[3]).toMatchObject({ removeProtection: false });
      });
    });
  });

  describe('delete', () => {
    const mockPackagePolicy = {
      id: 'test-package-policy',
      type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      attributes: createPackagePolicyMock(),
      references: [],
    };

    it('should allow to delete package policies from ES index', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: createPackagePolicyMock(),
          },
        ],
      });

      soClient.get.mockResolvedValueOnce({
        ...mockPackagePolicy,
      });

      mockAgentPolicyGet();

      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });
      const idToDelete = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
      soClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: idToDelete, type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await packagePolicyService.delete(soClient, esClient, [idToDelete]);

      expect(soClient.bulkDelete).toHaveBeenCalledWith(
        [{ id: idToDelete, type: 'ingest-package-policies' }],
        { force: true }
      );
      expect(soClient.bulkDelete).toHaveBeenCalledWith(
        [{ id: `${idToDelete}:prev`, type: 'ingest-package-policies' }],
        { force: true }
      );
    });
    it('should allow to delete orphaned package policies from ES index', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: createPackagePolicyMock(),
          },
        ],
      });

      soClient.get.mockResolvedValueOnce({
        ...mockPackagePolicy,
      });

      // agent policy not found
      mockAgentPolicyService.get.mockRejectedValueOnce({
        output: { statusCode: 404, payload: { message: 'policy not found' } },
      });

      mockAgentPolicyService.getByIds.mockResolvedValueOnce([
        {
          id: 'agentPolicy1',
          name: 'Test Agent Policy',
          namespace: 'test',
          status: 'active',
          is_managed: false,
          updated_at: new Date().toISOString(),
          updated_by: 'test',
          revision: 1,
          is_protected: false,
          space_ids: ['default'],
        },
      ]);

      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });
      const idToDelete = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
      soClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: idToDelete, type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await packagePolicyService.delete(soClient, esClient, [idToDelete]);

      expect(soClient.bulkDelete).toHaveBeenCalledWith(
        [{ id: idToDelete, type: 'ingest-package-policies' }],
        { force: true }
      );
    });

    it('should not allow to delete managed package policies', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: createPackagePolicyMock(),
          },
        ],
      });

      soClient.get.mockResolvedValueOnce({
        ...mockPackagePolicy,
      });
      const managedAgentPolicy = {
        id: 'agentPolicy1',
        name: 'Test Agent Policy',
        namespace: 'test',
        status: 'active',
        is_managed: true,
        updated_at: new Date().toISOString(),
        updated_by: 'test',
        revision: 1,
        is_protected: false,
        space_ids: ['default'],
      } as any;
      // agent policy not found
      mockAgentPolicyService.get.mockResolvedValueOnce(managedAgentPolicy);

      mockAgentPolicyService.getByIds.mockResolvedValueOnce([managedAgentPolicy]);

      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });
      const idToDelete = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';

      expect(await packagePolicyService.delete(soClient, esClient, [idToDelete])).toEqual([
        {
          body: {
            message:
              'Cannot remove integrations of hosted agent policy in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
          },
          id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
          statusCode: 400,
          success: false,
        },
      ]);

      expect(soClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('should call audit logger', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [{ ...mockPackagePolicy }],
      });

      soClient.get.mockResolvedValueOnce({
        ...mockPackagePolicy,
      });

      soClient.delete.mockResolvedValueOnce({
        ...mockPackagePolicy,
      });

      await packagePolicyService.delete(soClient, esClient, ['test-package-policy']);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'delete',
        id: 'test-package-policy',
        savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      });
    });

    it('should return empty array if no package policies are found', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const res = await packagePolicyService.delete(soClient, esClient, ['test-package-policy']);
      expect(res).toEqual([]);
    });

    it('should delete secrets for regular package policies', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      // Clear mock calls from previous tests
      mockedSecretsModule.deleteSecretsIfNotReferenced.mockClear();

      const packagePolicyWithSecrets = {
        ...createPackagePolicyMock(),
        id: 'policy-with-secrets',
        secret_references: [{ id: 'secret-1' }, { id: 'secret-2' }],
      };

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-with-secrets',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            version: 'test',
            attributes: packagePolicyWithSecrets,
          },
        ],
      });

      soClient.get.mockResolvedValueOnce({
        id: 'policy-with-secrets',
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        attributes: packagePolicyWithSecrets,
        references: [],
      });

      mockAgentPolicyGet();

      (getPackageInfo as jest.Mock).mockResolvedValue({
        name: 'test',
        version: '1.0.0',
      } as PackageInfo);

      soClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'policy-with-secrets',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      await packagePolicyService.delete(soClient, esClient, ['policy-with-secrets']);

      // Verify that deleteSecretsIfNotReferenced was called with the correct secret IDs
      expect(mockedSecretsModule.deleteSecretsIfNotReferenced).toHaveBeenCalledWith({
        esClient,
        soClient,
        ids: ['secret-1', 'secret-2'],
      });
    });

    it('should NOT delete secrets for package policies with cloud_connector_id', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      // Clear mock calls from previous tests
      mockedSecretsModule.deleteSecretsIfNotReferenced.mockClear();

      const packagePolicyWithCloudConnector = {
        ...createPackagePolicyMock(),
        id: 'policy-with-cloud-connector',
        cloud_connector_id: 'test-cloud-connector-123',
        secret_references: [{ id: 'cloud-connector-secret-1' }, { id: 'cloud-connector-secret-2' }],
      };

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-with-cloud-connector',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            version: 'test',
            attributes: packagePolicyWithCloudConnector,
          },
        ],
      });

      soClient.get.mockResolvedValueOnce({
        id: 'policy-with-cloud-connector',
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        attributes: packagePolicyWithCloudConnector,
        references: [],
      });

      mockAgentPolicyGet();

      (getPackageInfo as jest.Mock).mockResolvedValue({
        name: 'test',
        version: '1.0.0',
      } as PackageInfo);

      soClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'policy-with-cloud-connector',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      await packagePolicyService.delete(soClient, esClient, ['policy-with-cloud-connector']);

      // Verify that deleteSecretsIfNotReferenced was NOT called for cloud connector secrets
      expect(mockedSecretsModule.deleteSecretsIfNotReferenced).not.toHaveBeenCalled();
    });

    it('should handle mixed package policies - some with cloud connector, some without', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      // Clear mock calls from previous tests
      mockedSecretsModule.deleteSecretsIfNotReferenced.mockClear();

      const regularPackagePolicy = {
        ...createPackagePolicyMock(),
        id: 'regular-policy',
        secret_references: [{ id: 'regular-secret-1' }],
      };

      const cloudConnectorPackagePolicy = {
        ...createPackagePolicyMock(),
        id: 'cloud-connector-policy',
        cloud_connector_id: 'test-cloud-connector-123',
        secret_references: [{ id: 'cloud-connector-secret-1' }],
      };

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'regular-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            version: 'test',
            attributes: regularPackagePolicy,
          },
          {
            id: 'cloud-connector-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            references: [],
            version: 'test',
            attributes: cloudConnectorPackagePolicy,
          },
        ],
      });

      mockAgentPolicyGet();

      (getPackageInfo as jest.Mock).mockResolvedValue({
        name: 'test',
        version: '1.0.0',
      } as PackageInfo);

      soClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'regular-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
          {
            id: 'cloud-connector-policy',
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      await packagePolicyService.delete(soClient, esClient, [
        'regular-policy',
        'cloud-connector-policy',
      ]);

      // Should have been called once for the regular policy secrets only
      expect(mockedSecretsModule.deleteSecretsIfNotReferenced).toHaveBeenCalledTimes(1);
      expect(mockedSecretsModule.deleteSecretsIfNotReferenced).toHaveBeenCalledWith({
        esClient,
        soClient,
        ids: ['regular-secret-1'],
      });
    });
  });

  describe('runPostDeleteExternalCallbacks', () => {
    let callbackOne: jest.MockedFunction<PostPackagePolicyPostDeleteCallback>;
    let callbackTwo: jest.MockedFunction<PostPackagePolicyPostDeleteCallback>;
    let callingOrder: string[];
    let deletedPackagePolicies: PostDeletePackagePoliciesResponse;

    beforeEach(() => {
      callingOrder = [];
      deletedPackagePolicies = [
        { id: 'a', success: true },
        { id: 'a', success: true },
      ];
      callbackOne = jest.fn(async (deletedPolicies, soClient, esClient) => {
        callingOrder.push('one');
      });
      callbackTwo = jest.fn(async (deletedPolicies, soClient, esClient) => {
        callingOrder.push('two');
      });
      appContextService.addExternalCallback('packagePolicyPostDelete', callbackOne);
      appContextService.addExternalCallback('packagePolicyPostDelete', callbackTwo);
    });

    it('should execute external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await packagePolicyService.runPostDeleteExternalCallbacks(
        deletedPackagePolicies,
        soClient,
        esClient
      );

      expect(callbackOne).toHaveBeenCalledWith(
        deletedPackagePolicies,
        expect.any(Object),
        expect.any(Object),
        undefined,
        undefined
      );
      expect(callbackTwo).toHaveBeenCalledWith(
        deletedPackagePolicies,
        expect.any(Object),
        expect.any(Object),
        undefined,
        undefined
      );
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it("should execute all external callbacks even if one throw's", async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw new Error('foo');
      });
      await expect(
        packagePolicyService.runPostDeleteExternalCallbacks(
          deletedPackagePolicies,
          soClient,
          esClient
        )
      ).rejects.toThrow(FleetError);
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it('should provide an array of errors encountered by running external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      let error: FleetError;
      const callbackOneError = new Error('foo 1');
      const callbackTwoError = new Error('foo 2');

      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw callbackOneError;
      });
      callbackTwo.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('two');
        throw callbackTwoError;
      });

      await packagePolicyService
        .runPostDeleteExternalCallbacks(deletedPackagePolicies, soClient, esClient)
        .catch((e) => {
          error = e;
        });

      expect(error!.message).toEqual(
        '2 errors encountered while executing package post delete external callbacks'
      );
      expect(error!.meta).toEqual([callbackOneError, callbackTwoError]);
      expect(callingOrder).toEqual(['one', 'two']);
    });
  });

  describe('runDeleteExternalCallbacks', () => {
    let callbackOne: jest.MockedFunction<PostPackagePolicyDeleteCallback>;
    let callbackTwo: jest.MockedFunction<PostPackagePolicyDeleteCallback>;
    let callingOrder: string[];
    let packagePolicies: DeletePackagePoliciesResponse;

    beforeEach(() => {
      callingOrder = [];
      packagePolicies = [{ id: 'a' }, { id: 'a' }] as DeletePackagePoliciesResponse;
      callbackOne = jest.fn(async (deletedPolicies, soClient, esClient) => {
        callingOrder.push('one');
      });
      callbackTwo = jest.fn(async (deletedPolicies, soClient, esClient) => {
        callingOrder.push('two');
      });
      appContextService.addExternalCallback('packagePolicyDelete', callbackOne);
      appContextService.addExternalCallback('packagePolicyDelete', callbackTwo);
    });

    it('should execute external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await packagePolicyService.runDeleteExternalCallbacks(packagePolicies, soClient, esClient);

      expect(callbackOne).toHaveBeenCalledWith(packagePolicies, soClient, esClient);
      expect(callbackTwo).toHaveBeenCalledWith(packagePolicies, soClient, esClient);
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it("should execute all external callbacks even if one throw's", async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw new Error('foo');
      });
      await expect(
        packagePolicyService.runDeleteExternalCallbacks(packagePolicies, soClient, esClient)
      ).rejects.toThrow(FleetError);
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it('should provide an array of errors encountered by running external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      let error: FleetError;
      const callbackOneError = new Error('foo 1');
      const callbackTwoError = new Error('foo 2');

      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw callbackOneError;
      });
      callbackTwo.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('two');
        throw callbackTwoError;
      });

      await packagePolicyService
        .runDeleteExternalCallbacks(packagePolicies, soClient, esClient)
        .catch((e) => {
          error = e;
        });

      expect(error!.message).toEqual(
        '2 errors encountered while executing package delete external callbacks'
      );
      expect(error!.meta).toEqual([callbackOneError, callbackTwoError]);
      expect(callingOrder).toEqual(['one', 'two']);
    });
  });

  describe('runExternalCallbacks', () => {
    let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
    let request: KibanaRequest;

    const newPackagePolicy = {
      policy_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
      policy_ids: ['a5ca00c0-b30c-11ea-9732-1bb05811278c'],
      description: '',
      enabled: true,
      inputs: [],
      name: 'endpoint-1',
      namespace: 'default',
      package: {
        name: 'endpoint',
        title: 'Elastic Endpoint',
        version: '0.5.0',
      },
    };

    const callbackCallingOrder: string[] = [];

    // Callback one adds an input that includes a `config` property
    const callbackOne: CombinedExternalCallback = jest.fn(async (ds) => {
      callbackCallingOrder.push('one');
      return {
        ...ds,
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              one: {
                value: 'inserted by callbackOne',
              },
            },
          },
        ],
      };
    });

    // Callback two adds an additional `input[0].config` property
    const callbackTwo: CombinedExternalCallback = jest.fn(async (ds) => {
      callbackCallingOrder.push('two');
      return {
        ...ds,
        inputs: [
          {
            ...ds.inputs[0],
            config: {
              ...ds.inputs[0].config,
              two: {
                value: 'inserted by callbackTwo',
              },
            },
          },
        ],
      };
    });

    beforeEach(() => {
      context = xpackMocks.createRequestHandlerContext();
      request = httpServerMock.createKibanaRequest();
    });

    afterEach(() => {
      jest.clearAllMocks();
      callbackCallingOrder.length = 0;
    });

    it('should call external callbacks in expected order', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const callbackA: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('a');
        return ds;
      });

      const callbackB: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('b');
        return ds;
      });

      appContextService.addExternalCallback('packagePolicyCreate', callbackA);
      appContextService.addExternalCallback('packagePolicyCreate', callbackB);

      await packagePolicyService.runExternalCallbacks(
        'packagePolicyCreate',
        newPackagePolicy,
        soClient,
        esClient,
        coreMock.createCustomRequestHandlerContext(context),
        request
      );
      expect(callbackCallingOrder).toEqual(['a', 'b']);
    });

    it('should feed package policy returned by last callback', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      appContextService.addExternalCallback('packagePolicyCreate', callbackOne);
      appContextService.addExternalCallback('packagePolicyCreate', callbackTwo);

      await packagePolicyService.runExternalCallbacks(
        'packagePolicyCreate',
        newPackagePolicy,
        soClient,
        esClient,
        coreMock.createCustomRequestHandlerContext(context),
        request
      );

      expect((callbackOne as jest.Mock).mock.calls[0][0].inputs).toHaveLength(0);
      expect((callbackTwo as jest.Mock).mock.calls[0][0].inputs).toHaveLength(1);
      expect((callbackTwo as jest.Mock).mock.calls[0][0].inputs[0].config.one.value).toEqual(
        'inserted by callbackOne'
      );
    });

    describe('with a callback that throws an exception', () => {
      const callbackThree: CombinedExternalCallback = jest.fn(async () => {
        callbackCallingOrder.push('three');
        throw new Error('callbackThree threw error on purpose');
      });

      const callbackFour: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('four');
        return {
          ...ds,
          inputs: [
            {
              ...ds.inputs[0],
              config: {
                ...ds.inputs[0].config,
                four: {
                  value: 'inserted by callbackFour',
                },
              },
            },
          ],
        };
      });

      beforeEach(() => {
        appContextService.addExternalCallback('packagePolicyCreate', callbackOne);
        appContextService.addExternalCallback('packagePolicyCreate', callbackTwo);
        appContextService.addExternalCallback('packagePolicyCreate', callbackThree);
        appContextService.addExternalCallback('packagePolicyCreate', callbackFour);
      });

      it('should fail to execute remaining callbacks after a callback exception', async () => {
        const soClient = createSavedObjectClientMock();
        const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        try {
          await packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            soClient,
            esClient,
            coreMock.createCustomRequestHandlerContext(context),
            request
          );
        } catch (e) {
          // expecting an error
        }

        expect(callbackCallingOrder).toEqual(['one', 'two', 'three']);
        expect((callbackOne as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackTwo as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackThree as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackFour as jest.Mock).mock.calls.length).toBe(0);
      });

      it('should fail to return the package policy', async () => {
        const soClient = createSavedObjectClientMock();
        const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
        await expect(
          packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            soClient,
            esClient,
            coreMock.createCustomRequestHandlerContext(context),
            request
          )
        ).rejects.toThrow('callbackThree threw error on purpose');
      });
    });

    describe('with validation errors', () => {
      it('should convert ValidationError to PackagePolicyValidationError', async () => {
        const soClient = createSavedObjectClientMock();
        const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        // Create a callback that returns an invalid package policy (uppercase namespace)
        const invalidCallback: CombinedExternalCallback = jest.fn(async (ds) => {
          return {
            ...ds,
            namespace: 'InvalidNamespace', // This should cause a validation error
          };
        });

        appContextService.addExternalCallback('packagePolicyCreate', invalidCallback);

        await expect(
          packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            soClient,
            esClient,
            coreMock.createCustomRequestHandlerContext(context),
            request
          )
        ).rejects.toThrow(PackagePolicyValidationError);

        // Verify the error message contains the validation details
        try {
          await packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            soClient,
            esClient,
            coreMock.createCustomRequestHandlerContext(context),
            request
          );
        } catch (error) {
          expect(error).toBeInstanceOf(PackagePolicyValidationError);
          expect(error.message).toContain('Namespace must be lowercase');
        }
      });
    });
  });

  describe('runPackagePolicyPostCreateCallback', () => {
    let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
    let request: KibanaRequest;
    const packagePolicy = {
      id: '93ac25fe-0467-4fcc-a3c5-57a26a8496e2',
      version: 'WzYyMzcsMV0=',
      name: 'my-cis_kubernetes_benchmark',
      namespace: 'default',
      output_id: null,
      description: '',
      package: {
        name: 'cis_kubernetes_benchmark',
        title: 'CIS Kubernetes Benchmark',
        version: '0.0.3',
      },
      enabled: true,
      policy_id: '1e6d0690-b995-11ec-a355-d35391e25881',
      policy_ids: ['1e6d0690-b995-11ec-a355-d35391e25881'],
      inputs: [
        {
          type: 'cloudbeat',
          policy_template: 'findings',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'cis_kubernetes_benchmark.findings',
              },
              id: 'cloudbeat-cis_kubernetes_benchmark.findings-66b402b3-f24a-4018-b3d0-b88582a836ab',
              compiled_stream: {
                processors: [
                  {
                    add_cluster_id: null,
                  },
                ],
              },
            },
          ],
        },
      ],
      vars: {
        dataYaml: {
          type: 'yaml',
        },
      },
      elasticsearch: undefined,
      revision: 1,
      created_at: '2022-04-11T12:44:43.385Z',
      created_by: 'elastic',
      updated_at: '2022-04-11T12:44:43.385Z',
      updated_by: 'elastic',
    };
    const callbackCallingOrder: string[] = [];

    beforeEach(() => {
      context = xpackMocks.createRequestHandlerContext();
      request = httpServerMock.createKibanaRequest();
    });

    afterEach(() => {
      jest.clearAllMocks();
      callbackCallingOrder.length = 0;
    });

    it('should execute PostPackagePolicyPostCreateCallback external callbacks', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const callbackA: PostPackagePolicyPostCreateCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('a');
        return ds;
      });

      const callbackB: PostPackagePolicyPostCreateCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('b');
        return ds;
      });

      appContextService.addExternalCallback('packagePolicyPostCreate', callbackA);
      appContextService.addExternalCallback('packagePolicyPostCreate', callbackB);

      const requestContext = coreMock.createCustomRequestHandlerContext(context);
      await packagePolicyService.runExternalCallbacks(
        'packagePolicyPostCreate',
        packagePolicy,
        soClient,
        esClient,
        requestContext,
        request
      );

      expect(callbackA).toHaveBeenCalledWith(
        packagePolicy,
        soClient,
        esClient,
        requestContext,
        request
      );
      expect(callbackB).toHaveBeenCalledWith(
        packagePolicy,
        soClient,
        esClient,
        requestContext,
        request
      );
      expect(callbackCallingOrder).toEqual(['a', 'b']);
    });
  });

  describe('preconfigurePackageInputs', () => {
    describe('when variable is already defined', () => {
      it('override original variable value', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
            },
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual('/var/log/new-logfile.log');
      });
    });

    describe('when variable is undefined in original object', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: 'template_1',
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when variable is undefined in original object and policy_template is undefined', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: undefined, // preconfigured input overrides don't have a policy_template
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when an input of the same type exists under multiple policy templates', () => {
      it('adds variable definitions to the proper streams', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs',
              policy_template: 'template_2',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
            {
              name: 'template_2',
              title: 'Template 2',
              description: 'Template 2',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
            ],
          },
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_2',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template2-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );

        expect(result.inputs).toHaveLength(2);

        const template1Input = result.inputs.find(
          (input) => input.policy_template === 'template_1'
        );
        const template2Input = result.inputs.find(
          (input) => input.policy_template === 'template_2'
        );

        expect(template1Input).toBeDefined();
        expect(template2Input).toBeDefined();

        expect(template1Input?.streams[0].vars?.log_file_path.value).toBe(
          '/var/log/template1-logfile.log'
        );

        expect(template2Input?.streams[0].vars?.log_file_path.value).toBe(
          '/var/log/template2-logfile.log'
        );
      });
    });

    describe('when an input or stream is disabled by default in the package', () => {
      it('allow preconfiguration to enable it', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: false,
              streams: [
                {
                  enabled: false,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile2',
                  },
                  vars: {
                    log_file_path_2: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs_2',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs',
              policy_template: 'template_2',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
                {
                  type: 'logs_2',
                  title: 'Log 2',
                  description: 'Log Input 2',
                  vars: [],
                },
              ],
            },
            {
              name: 'template_2',
              title: 'Template 2',
              description: 'Template 2',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile2',
                },
                vars: {
                  log_file_path_2: {
                    type: 'text',
                    value: '/var/log/template1-logfile2.log',
                  },
                },
              },
            ],
          },
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_2',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template2-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );

        const template1Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_1'
        );

        const template2Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_2'
        );

        expect(template1Inputs).toHaveLength(2);
        expect(template2Inputs).toHaveLength(1);

        const logsInput = template1Inputs?.find((input) => input.type === 'logs');
        expect(logsInput?.enabled).toBe(true);

        const logfileStream = logsInput?.streams.find(
          (stream) => stream.data_stream.type === 'logfile'
        );

        expect(logfileStream?.enabled).toBe(true);
      });
    });

    describe('when a datastream is deleted from an input', () => {
      it('it remove the non existing datastream', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'dataset.test123', type: 'log' },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
            },
          },
        ];

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as PreconfiguredInputs[]
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual('/var/log/new-logfile.log');
      });
    });
  });

  describe('updatePackageInputs', () => {
    describe('when variable is already defined', () => {
      it('preserves original variable value without overwriting', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
                is_value_enabled: {
                  type: 'bool',
                  value: false,
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'is_value_enabled',
                      type: 'bool',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              is_value_enabled: {
                type: 'bool',
                value: 'true',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
        expect(result.inputs[0]?.vars?.is_value_enabled.value).toEqual(false);
      });
    });

    describe('when variable is undefined in original object', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: 'template_1',
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when a variable is defined in original object, but not in override', () => {
      it('it is removed from the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: 'template_1',
            vars: {
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs[0]?.vars?.path).toBeUndefined();
        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when variable is undefined in original object and policy_template is undefined', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: undefined, // preconfigured input overrides don't have a policy_template
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('global variables', () => {
      it('adds the global variable definitions to the resulting object when they are not defined in the original policy', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          vars: [
            {
              name: 'global_var_1',
              type: 'text',
              default: 'value1',
            },
            {
              name: 'global_var_2',
              type: 'text',
            },
          ],
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'log_file_path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.vars).toBeDefined();
        expect(result.vars?.global_var_1).toBeDefined();
        expect(result.vars?.global_var_1.value).toBe('value1');
        expect(result.vars?.global_var_2).toBeDefined();
        expect(result.vars?.global_var_2.value).toBeUndefined();
      });

      it('removes the global variable definitions in the resulting object when they are not defined in the package', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          vars: {
            global_var_1: {
              type: 'text',
              value: 'value1',
            },
            global_var_2: {
              type: 'text',
              value: 'value2',
            },
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'log_file_path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.vars).toBeUndefined();
      });

      describe('when global vars are defined in the original policy and defined in the package', () => {
        it('preserves existing global vars values, and adds new ones', () => {
          const basePackagePolicy: NewPackagePolicy = {
            name: 'base-package-policy',
            description: 'Base Package Policy',
            namespace: 'default',
            enabled: true,
            policy_id: 'xxxx',
            policy_ids: ['xxxx'],
            package: {
              name: 'test-package',
              title: 'Test Package',
              version: '0.0.1',
            },
            vars: {
              global_var_1: {
                type: 'text',
                value: 'value1',
              },
              global_var_2: {
                type: 'text',
                value: 'value2',
              },
            },
            inputs: [
              {
                type: 'logs',
                policy_template: 'template_1',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: {
                      dataset: 'test.logs',
                      type: 'logfile',
                    },
                    vars: {
                      log_file_path: {
                        type: 'text',
                      },
                    },
                  },
                ],
              },
            ],
          };

          const packageInfo: PackageInfo = {
            name: 'test-package',
            description: 'Test Package',
            title: 'Test Package',
            version: '0.0.1',
            latestVersion: '0.0.1',
            release: 'experimental',
            format_version: '1.0.0',
            owner: { github: 'elastic/fleet' },
            vars: [
              {
                name: 'global_var_1',
                type: 'text',
                default: 'newValue1',
              },
              {
                name: 'global_var_2',
                type: 'text',
              },
              {
                name: 'global_var_3',
                type: 'text',
                default: 'newValue3',
              },
            ],
            policy_templates: [
              {
                name: 'template_1',
                title: 'Template 1',
                description: 'Template 1',
                inputs: [
                  {
                    type: 'logs',
                    title: 'Log',
                    description: 'Log Input',
                    vars: [
                      {
                        name: 'log_file_path',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
            // @ts-ignore
            assets: {},
          };

          const inputsOverride: NewPackagePolicyInput[] = [
            {
              type: 'logs',
              enabled: true,
              policy_template: 'template_1',
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                      value: '/var/log/template1-logfile.log',
                    },
                  },
                },
              ],
            },
          ];

          const result = updatePackageInputs(
            basePackagePolicy,
            packageInfo,
            inputsOverride as InputsOverride[],
            false
          );

          expect(result.vars).toBeDefined();
          expect(result.vars?.global_var_1).toBeDefined();
          expect(result.vars?.global_var_1.value).toBe('value1');
          expect(result.vars?.global_var_2).toBeDefined();
          expect(result.vars?.global_var_2.value).toBe('value2');
          expect(result.vars?.global_var_3).toBeDefined();
          expect(result.vars?.global_var_3.value).toBe('newValue3');
        });

        it('preserves existing global vars values, and removes ones no longer defined in the package', () => {
          const basePackagePolicy: NewPackagePolicy = {
            name: 'base-package-policy',
            description: 'Base Package Policy',
            namespace: 'default',
            enabled: true,
            policy_id: 'xxxx',
            policy_ids: ['xxxx'],
            package: {
              name: 'test-package',
              title: 'Test Package',
              version: '0.0.1',
            },
            vars: {
              global_var_1: {
                type: 'text',
                value: 'value1',
              },
              global_var_2: {
                type: 'text',
                value: 'value2',
              },
            },
            inputs: [
              {
                type: 'logs',
                policy_template: 'template_1',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: {
                      dataset: 'test.logs',
                      type: 'logfile',
                    },
                    vars: {
                      log_file_path: {
                        type: 'text',
                      },
                    },
                  },
                ],
              },
            ],
          };

          const packageInfo: PackageInfo = {
            name: 'test-package',
            description: 'Test Package',
            title: 'Test Package',
            version: '0.0.1',
            latestVersion: '0.0.1',
            release: 'experimental',
            format_version: '1.0.0',
            owner: { github: 'elastic/fleet' },
            vars: [
              {
                name: 'global_var_1',
                type: 'text',
                default: 'newValue1',
              },
              {
                name: 'global_var_2',
                type: 'text',
              },
              {
                name: 'global_var_3',
                type: 'text',
                default: 'newValue3',
              },
            ],
            policy_templates: [
              {
                name: 'template_1',
                title: 'Template 1',
                description: 'Template 1',
                inputs: [
                  {
                    type: 'logs',
                    title: 'Log',
                    description: 'Log Input',
                    vars: [
                      {
                        name: 'log_file_path',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
            // @ts-ignore
            assets: {},
          };

          const inputsOverride: NewPackagePolicyInput[] = [
            {
              type: 'logs',
              enabled: true,
              policy_template: 'template_1',
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                      value: '/var/log/template1-logfile.log',
                    },
                  },
                },
              ],
            },
          ];

          const result = updatePackageInputs(
            basePackagePolicy,
            packageInfo,
            inputsOverride as InputsOverride[],
            false
          );

          expect(result.vars).toBeDefined();
          expect(result.vars?.global_var_1).toBeDefined();
          expect(result.vars?.global_var_1.value).toBe('value1');
          expect(result.vars?.global_var_2).toBeDefined();
          expect(result.vars?.global_var_2.value).toBe('value2');
          expect(result.vars?.global_var_3).toBeDefined();
          expect(result.vars?.global_var_3.value).toBe('newValue3');
        });
      });
    });
    describe('when a variable is no longer defined in the new version of a stream', () => {
      it('the old variable definition is removed', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                    old_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs).toHaveLength(1);

        const template1Input = result.inputs.find(
          (input) => input.policy_template === 'template_1'
        );
        expect(template1Input).toBeDefined();
        expect(template1Input?.streams[0].vars?.log_file_path.value).toBe(
          '/var/log/template1-logfile.log'
        );
        expect(template1Input?.streams[0].vars?.old_file_path).toBeUndefined();
      });
    });

    describe('when an input or stream is disabled on the original policy object', () => {
      it('remains disabled on the resulting policy object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: false,
              streams: [
                {
                  enabled: false,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile2',
                  },
                  vars: {
                    log_file_path_2: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs_2',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs',
              policy_template: 'template_2',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
                {
                  type: 'logs_2',
                  title: 'Log 2',
                  description: 'Log Input 2',
                  vars: [],
                },
              ],
            },
            {
              name: 'template_2',
              title: 'Template 2',
              description: 'Template 2',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile2',
                },
                vars: {
                  log_file_path_2: {
                    type: 'text',
                    value: '/var/log/template1-logfile2.log',
                  },
                },
              },
            ],
          },
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_2',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template2-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        const template1Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_1'
        );

        const template2Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_2'
        );

        expect(template1Inputs).toHaveLength(2);
        expect(template2Inputs).toHaveLength(1);

        const logsInput = template1Inputs?.find((input) => input.type === 'logs');
        expect(logsInput?.enabled).toBe(false);

        const logfileStream = logsInput?.streams.find(
          (stream) => stream.data_stream.type === 'logfile'
        );

        expect(logfileStream?.enabled).toBe(false);
      });
    });

    describe('when a datastream is deleted from an input', () => {
      it('it remove the non existing datastream', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'dataset.test123', type: 'log' },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
      });
    });

    describe('when policy_template is defined on update, but undefined on existing input with matching type', () => {
      it('generates the proper inputs, and adds a policy_template field', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: 'template_1',
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs.length).toBe(1);
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
        expect(result.inputs[0]?.vars?.path_2.value).toBe('/var/log/custom.log');
        expect(result.inputs[0]?.policy_template).toBe('template_1');
      });
    });

    describe('when updating to an input package ', () => {
      it('it should keep stream ids', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              id: 'input-1',
              type: 'logs',
              enabled: true,
              streams: [
                {
                  id: 'stream-1',
                  enabled: true,
                  data_stream: {
                    dataset: 'dataset.test123',
                    type: 'log',
                  },
                  vars: {
                    path: {
                      type: 'text',
                      value: ['/var/log/test123.log'],
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          type: 'input',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              input: 'logs',
              type: 'logs',
              vars: [
                {
                  name: 'path',
                  type: 'text',
                },
                {
                  name: 'path_2',
                  type: 'text',
                  default: '/var/log/custom.log',
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = packageToPackagePolicyInputs(packageInfo);

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs.length).toBe(1);
        expect(result.inputs[0]?.streams[0]?.id).toEqual('stream-1');
        expect(result.inputs[0]?.streams[0]?.vars?.path.value).toEqual(['/var/log/test123.log']);
        expect(result.inputs[0]?.streams[0]?.vars?.path_2.value).toBe('/var/log/custom.log');
        expect(result.inputs[0]?.policy_template).toBe('template_1');
      });
    });

    describe('when updating a limited package', () => {
      it('should not add new inputs', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          policy_ids: ['xxxx'],
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              enabled: true,
              type: 'connectors-py',
              policy_template: 'github',
              streams: [],
            },
          ],
        };
        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              multiple: false,
              name: 'github',
              description: 'test',
              title: 'github',
              template_path: 'agent.yml.hbs',
              type: 'connectors-py',
              input: 'connectors-py',
            },
            {
              multiple: false,
              type: 'connectors-py',
              name: 'gmail',
              description: 'test',
              title: 'gmail',
              template_path: 'agent.yml.hbs',
              input: 'connectors-py',
            },
          ],
        } as any;

        const inputsOverride: NewPackagePolicyInput[] = packageToPackagePolicyInputs(packageInfo);
        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs.length).toBe(2);
        const enabledInputs = result.inputs.filter((input) => input.enabled);
        const disabledInputs = result.inputs.filter((input) => !input.enabled);
        expect(enabledInputs.length).toBe(1);
        expect(disabledInputs.length).toBe(1);
        expect(enabledInputs[0]?.type).toBe('connectors-py');
        expect(enabledInputs[0]?.policy_template).toBe('github');
        expect(disabledInputs[0]?.type).toBe('connectors-py');
        expect(disabledInputs[0]?.policy_template).toBe('gmail');
      });
    });
  });

  describe('enrich package policy on create', () => {
    beforeEach(() => {
      (packageToPackagePolicy as jest.Mock).mockReturnValue({
        package: { name: 'apache', title: 'Apache', version: '1.0.0' },
        inputs: [
          {
            type: 'logfile',
            policy_template: 'log',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.access',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/var/log/apache2/access.log*'],
            type: 'text',
          },
        },
      });
    });

    it('should enrich from epm with defaults', async () => {
      const newPolicy = {
        name: 'apache-1',
        inputs: [{ type: 'logfile', enabled: false }],
        package: { name: 'apache', version: '0.3.3' },
        policy_id: '1',
        policy_ids: ['1'],
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        createSavedObjectClientMock(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'apache-1',
        namespace: '',
        description: '',
        output_id: undefined,
        package: {
          name: 'apache',
          title: 'Apache',
          version: '1.0.0',
          experimental_data_stream_features: undefined,
        },
        enabled: true,
        policy_id: '1',
        policy_ids: ['1'],
        supports_agentless: undefined,
        inputs: [
          {
            enabled: false,
            type: 'logfile',
            policy_template: 'log',
            streams: [
              {
                enabled: false,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.access',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/var/log/apache2/access.log*'],
            type: 'text',
          },
        },
      });
    });

    it('should enrich from epm with defaults using policy template', async () => {
      (packageToPackagePolicy as jest.Mock).mockReturnValueOnce({
        package: { name: 'aws', title: 'AWS', version: '1.0.0' },
        inputs: [
          {
            type: 'aws/metrics',
            policy_template: 'cloudtrail',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudtrail',
                },
              },
            ],
          },
          {
            type: 'aws/metrics',
            policy_template: 'cloudwatch',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudwatch',
                },
              },
            ],
          },
        ],
      });
      const newPolicy = {
        name: 'aws-1',
        inputs: [{ type: 'aws/metrics', policy_template: 'cloudwatch', enabled: true }],
        package: { name: 'aws', version: '1.0.0' },
        policy_id: '1',
        policy_ids: ['1'],
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        createSavedObjectClientMock(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'aws-1',
        namespace: '',
        description: '',
        package: { name: 'aws', title: 'AWS', version: '1.0.0' },
        enabled: true,
        policy_id: '1',
        policy_ids: ['1'],
        inputs: [
          {
            type: 'aws/metrics',
            policy_template: 'cloudwatch',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudwatch',
                },
              },
            ],
          },
        ],
      });
    });

    it('should override defaults with new values', async () => {
      const newPolicy = {
        name: 'apache-2',
        namespace: 'namespace',
        description: 'desc',
        enabled: false,
        policy_id: '2',
        policy_ids: ['2'],
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.error',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
        package: { name: 'apache', version: '1.0.0' } as PackagePolicyPackage,
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        createSavedObjectClientMock(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'apache-2',
        namespace: 'namespace',
        description: 'desc',
        package: { name: 'apache', title: 'Apache', version: '1.0.0' },
        enabled: false,
        policy_id: '2',
        policy_ids: ['2'],
        inputs: [
          {
            enabled: true,
            type: 'logfile',
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.error',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
      });
    });
  });

  describe('fetchAllItemIds()', () => {
    let soClientMock: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(() => {
      soClientMock = createSavedObjectClientMock();

      soClientMock.find
        .mockResolvedValueOnce(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse())
        .mockResolvedValueOnce(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse())
        .mockResolvedValueOnce(
          Object.assign(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse(), {
            saved_objects: [],
          })
        );
    });

    it('should return an iterator', async () => {
      expect(await packagePolicyService.fetchAllItemIds(soClientMock)).toEqual({
        [Symbol.asyncIterator]: expect.any(Function),
      });
    });

    it('should provide item ids on every iteration', async () => {
      for await (const ids of await packagePolicyService.fetchAllItemIds(soClientMock)) {
        expect(ids).toEqual(['so-123', 'so-123']);
      }

      expect(soClientMock.find).toHaveBeenCalledTimes(3);
    });

    it('should use default options', async () => {
      for await (const ids of await packagePolicyService.fetchAllItemIds(soClientMock)) {
        expect(ids);
      }

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          perPage: 1000,
          sortField: 'created_at',
          sortOrder: 'asc',
          fields: [],
          filter: `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true`,
        })
      );
    });

    it('should use custom options when defined', async () => {
      for await (const ids of await packagePolicyService.fetchAllItemIds(soClientMock, {
        perPage: 13,
        kuery: 'one=two',
      })) {
        expect(ids);
      }

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          perPage: 13,
          sortField: 'created_at',
          sortOrder: 'asc',
          fields: [],
          filter: `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true AND (one=two)`,
        })
      );
    });
  });

  describe('fetchAllItems()', () => {
    let soClientMock: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(() => {
      soClientMock = createSavedObjectClientMock();

      soClientMock.find
        .mockResolvedValueOnce(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse())
        .mockResolvedValueOnce(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse())
        .mockResolvedValueOnce(
          Object.assign(PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse(), {
            saved_objects: [],
          })
        );
    });

    it('should return an iterator', async () => {
      expect(await packagePolicyService.fetchAllItems(soClientMock)).toEqual({
        [Symbol.asyncIterator]: expect.any(Function),
      });
    });

    it('should provide items on every iteration', async () => {
      for await (const items of await packagePolicyService.fetchAllItems(soClientMock)) {
        expect(items).toEqual(
          PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse().saved_objects.map(
            (soItem) => {
              return mapPackagePolicySavedObjectToPackagePolicy(soItem);
            }
          )
        );
      }

      expect(soClientMock.find).toHaveBeenCalledTimes(3);
    });

    it('should use default options', async () => {
      for await (const ids of await packagePolicyService.fetchAllItemIds(soClientMock)) {
        expect(ids);
      }

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          perPage: 1000,
          sortField: 'created_at',
          sortOrder: 'asc',
          fields: [],
          filter: `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true`,
        })
      );
    });

    it('should use space aware saved object type if user opt-in for space awareness', async () => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
      for await (const ids of await packagePolicyService.fetchAllItemIds(soClientMock)) {
        expect(ids);
      }

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          perPage: 1000,
          sortField: 'created_at',
          sortOrder: 'asc',
          fields: [],
          filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true`,
        })
      );
    });

    it('should use custom options when defined', async () => {
      for await (const ids of await packagePolicyService.fetchAllItems(soClientMock, {
        kuery: 'one=two',
        perPage: 12,
        sortOrder: 'desc',
        sortField: 'updated_by',
      })) {
        expect(ids);
      }

      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          perPage: 12,
          sortField: 'updated_by',
          sortOrder: 'desc',
          filter: `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true AND (one=two)`,
        })
      );
    });
  });

  describe('removeOutputFromAll', () => {
    it('should update policies using deleted output', async () => {
      const soClient = createSavedObjectClientMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const updateSpy = jest.spyOn(packagePolicyService, 'update');

      mockAgentPolicyGet();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'package-policy-1',
            attributes: {
              name: 'policy1',
              enabled: true,
              policy_ids: ['agent-policy-1'],
              output_id: 'output-id-123',
              inputs: [],
              package: { name: 'test-package', version: '1.0.0' },
            },
          },
        ],
      } as any);
      soClient.bulkGet.mockImplementation((objects): any => {
        if (objects.some(({ id }) => id === 'package-policy-1')) {
          return Promise.resolve({
            saved_objects: [
              {
                id: 'package-policy-1',
                attributes: {
                  name: 'policy1',
                  enabled: true,
                  policy_ids: ['agent-policy-1'],
                  output_id: 'output-id-123',
                  inputs: [],
                  package: { name: 'test-package', version: '1.0.0' },
                },
              },
            ],
          });
        }

        return Promise.resolve({ saved_objects: [] });
      });

      soClient.get.mockResolvedValue({
        id: 'package-policy-1',
        attributes: {
          name: 'policy1',
          enabled: true,
          policy_ids: ['agent-policy-1'],
          output_id: 'output-id-123',
          inputs: [],
          package: { name: 'test-package', version: '1.0.0' },
        },
      } as any);

      appContextService.start(
        createAppContextStartContractMock(undefined, false, {
          internal: soClient,
          withoutSpaceExtensions: soClient,
        })
      );

      await packagePolicyService.removeOutputFromAll(esClient, 'output-id-123');

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'package-policy-1',
        {
          name: 'policy1',
          enabled: true,
          policy_id: 'agent-policy-1',
          policy_ids: ['agent-policy-1'],
          output_id: null,
          inputs: [],
          package: { name: 'test-package', version: '1.0.0' },
        },
        {
          force: undefined,
        }
      );
    });
  });

  describe('Package policy rollback', () => {
    const mockSoClient = createSavedObjectClientMock();
    const id = 'test-package-policy';
    const mockPackagePolicySO: Array<SavedObjectsFindResult<PackagePolicySOAttributes>> = [
      {
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        id,
        namespaces: ['default'],
        attributes: {
          name: 'system-1',
          description: '',
          namespace: 'default',
          policy_id: '12345',
          policy_ids: ['12345'],
          enabled: true,
          inputs: [],
          package: { name: 'system', title: 'System', version: '2.3.2' },
          revision: 3,
          latest_revision: true,
          created_at: '2025-12-22T21:28:05.380Z',
          created_by: 'elastic',
          updated_at: '2025-12-22T21:28:05.380Z',
          updated_by: 'elastic',
        },
        references: [],
        score: 0,
      },
      {
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        id: `${id}:prev`,
        namespaces: ['default'],
        attributes: {
          name: 'system-1',
          description: '',
          namespace: 'default',
          policy_id: '12345',
          policy_ids: ['12345'],
          enabled: true,
          inputs: [],
          package: { name: 'system', title: 'System', version: '2.2.0' },
          revision: 1,
          latest_revision: false,
          created_at: '2024-12-22T21:28:05.380Z',
          created_by: 'elastic',
          updated_at: '2024-12-22T21:28:05.380Z',
          updated_by: 'elastic',
        },
        references: [],
        score: 0,
      },
      {
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        id: `${id}-myspace`,
        namespaces: ['myspace'],
        attributes: {
          name: 'system-1',
          description: '',
          namespace: 'myspace',
          policy_id: '6789',
          policy_ids: ['6789'],
          enabled: true,
          inputs: [],
          package: { name: 'system', title: 'System', version: '2.3.2' },
          revision: 3,
          latest_revision: true,
          created_at: '2025-12-22T21:28:05.380Z',
          created_by: 'elastic',
          updated_at: '2025-12-22T21:28:05.380Z',
          updated_by: 'elastic',
        },
        references: [],
        score: 0,
      },
      {
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        id: `${id}-myspace:prev`,
        namespaces: ['myspace'],
        attributes: {
          name: 'system-1',
          description: '',
          namespace: 'myspace',
          policy_id: '6789',
          policy_ids: ['6789'],
          enabled: true,
          inputs: [],
          package: { name: 'system', title: 'System', version: '2.2.0' },
          revision: 1,
          latest_revision: false,
          created_at: '2024-12-22T21:28:05.380Z',
          created_by: 'elastic',
          updated_at: '2024-12-22T21:28:05.380Z',
          updated_by: 'elastic',
        },
        references: [],
        score: 0,
      },
    ];
    const mockRollbackResult = {
      updatedPolicies: {
        default: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id,
            namespaces: ['default'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'default',
              policy_id: '12345',
              policy_ids: ['12345'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.2.0' },
              revision: 4,
              latest_revision: true,
              created_at: '2024-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2024-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            references: [],
            score: 0,
          },
        ],
        myspace: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: `${id}-myspace`,
            namespaces: ['myspace'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'myspace',
              policy_id: '6789',
              policy_ids: ['6789'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.2.0' },
              revision: 4,
              latest_revision: true,
              created_at: '2024-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2024-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            references: [],
            score: 0,
          },
        ],
      },
      copiedPolicies: {
        default: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: `${id}:copy`,
            namespaces: ['default'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'default',
              policy_id: '12345',
              policy_ids: ['12345'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.3.2' },
              revision: 3,
              latest_revision: true,
              created_at: '2025-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2025-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            initialNamespaces: ['default'],
            references: [],
            score: 0,
          },
        ],
        myspace: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: `${id}-myspace:copy`,
            namespaces: ['myspace'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'myspace',
              policy_id: '6789',
              policy_ids: ['6789'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.3.2' },
              revision: 3,
              latest_revision: true,
              created_at: '2025-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2025-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            initialNamespaces: ['myspace'],
            references: [],
            score: 0,
          },
        ],
      },
      previousVersionPolicies: {
        default: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: `${id}:prev`,
            namespaces: ['default'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'default',
              policy_id: '12345',
              policy_ids: ['12345'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.2.0' },
              revision: 1,
              latest_revision: false,
              created_at: '2024-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2024-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            references: [],
            score: 0,
          },
        ],
        myspace: [
          {
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: `${id}-myspace:prev`,
            namespaces: ['myspace'],
            attributes: {
              name: 'system-1',
              description: '',
              namespace: 'myspace',
              policy_id: '6789',
              policy_ids: ['6789'],
              enabled: true,
              inputs: [],
              package: { name: 'system', title: 'System', version: '2.2.0' },
              revision: 1,
              latest_revision: false,
              created_at: '2024-12-22T21:28:05.380Z',
              created_by: 'elastic',
              updated_at: '2024-12-22T21:28:05.380Z',
              updated_by: 'elastic',
            },
            references: [],
            score: 0,
          },
        ],
      },
    };

    describe('rollback', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should create temporary saved objects to back up package policies before updating them', async () => {
        await packagePolicyService.rollback(mockSoClient, mockPackagePolicySO);
        expect(mockSoClient.bulkCreate).toHaveBeenNthCalledWith(
          1,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id: `${id}:copy`,
              namespaces: ['default'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'default',
                policy_id: '12345',
                policy_ids: ['12345'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.3.2' },
                revision: 3,
                latest_revision: true,
                created_at: '2025-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2025-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              initialNamespaces: ['default'],
              score: 0,
            },
          ],
          { namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
          action: 'create',
          id: `${id}:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkCreate).toHaveBeenNthCalledWith(
          2,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id: `${id}-myspace:copy`,
              namespaces: ['myspace'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'myspace',
                policy_id: '6789',
                policy_ids: ['6789'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.3.2' },
                revision: 3,
                latest_revision: true,
                created_at: '2025-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2025-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              score: 0,
              initialNamespaces: ['myspace'],
            },
          ],
          { namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
          action: 'create',
          id: `${id}-myspace:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });

      it('should update package policies', async () => {
        await packagePolicyService.rollback(mockSoClient, mockPackagePolicySO);
        expect(mockSoClient.bulkUpdate).toHaveBeenNthCalledWith(
          1,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id,
              namespaces: ['default'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'default',
                policy_id: '12345',
                policy_ids: ['12345'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.2.0' },
                revision: 4,
                latest_revision: true,
                created_at: '2024-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2024-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              score: 0,
            },
          ],
          { namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(3, {
          action: 'update',
          id,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkUpdate).toHaveBeenNthCalledWith(
          2,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id: `${id}-myspace`,
              namespaces: ['myspace'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'myspace',
                policy_id: '6789',
                policy_ids: ['6789'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.2.0' },
                revision: 4,
                latest_revision: true,
                created_at: '2024-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2024-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              score: 0,
            },
          ],
          { namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(4, {
          action: 'update',
          id: `${id}-myspace`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });

      it('should return the updated and backed up package policies, and the old previous revisions', async () => {
        const rollbackResult = await packagePolicyService.rollback(
          mockSoClient,
          mockPackagePolicySO
        );
        expect(rollbackResult).toStrictEqual(mockRollbackResult);
      });
    });

    describe('restoreRollback', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockSoClient.bulkDelete.mockResolvedValue({
          statuses: [{ id, type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, success: true }],
        });
      });

      it('should update package policies to their status before rollback', async () => {
        await packagePolicyService.restoreRollback(mockSoClient, mockRollbackResult);
        expect(mockSoClient.bulkUpdate).toHaveBeenNthCalledWith(
          1,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id,
              namespaces: ['default'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'default',
                policy_id: '12345',
                policy_ids: ['12345'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.3.2' },
                revision: 3,
                latest_revision: true,
                created_at: '2025-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2025-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              score: 0,
            },
          ],
          { namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
          action: 'update',
          id,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkUpdate).toHaveBeenNthCalledWith(
          2,
          [
            {
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id: `${id}-myspace`,
              namespaces: ['myspace'],
              attributes: {
                name: 'system-1',
                description: '',
                namespace: 'myspace',
                policy_id: '6789',
                policy_ids: ['6789'],
                enabled: true,
                inputs: [],
                package: { name: 'system', title: 'System', version: '2.3.2' },
                revision: 3,
                latest_revision: true,
                created_at: '2025-12-22T21:28:05.380Z',
                created_by: 'elastic',
                updated_at: '2025-12-22T21:28:05.380Z',
                updated_by: 'elastic',
              },
              references: [],
              score: 0,
            },
          ],
          { namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(3, {
          action: 'update',
          id: `${id}-myspace`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });

      it('should delete the temporary package policy copies', async () => {
        await packagePolicyService.restoreRollback(mockSoClient, mockRollbackResult);
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          1,
          [
            {
              id: `${id}:copy`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
          action: 'delete',
          id: `${id}:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          2,
          [
            {
              id: `${id}-myspace:copy`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(4, {
          action: 'delete',
          id: `${id}-myspace:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });
    });

    describe('cleanupRollbackSavedObjects', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should delete the temporary package policy copies', async () => {
        await packagePolicyService.cleanupRollbackSavedObjects(mockSoClient, mockRollbackResult);
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          1,
          [
            {
              id: `${id}:copy`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
          action: 'delete',
          id: `${id}:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          2,
          [
            {
              id: `${id}-myspace:copy`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
          action: 'delete',
          id: `${id}-myspace:copy`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });

      it('should delete the package policy previous revisions', async () => {
        await packagePolicyService.cleanupRollbackSavedObjects(mockSoClient, mockRollbackResult);
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          3,
          [
            {
              id: `${id}:prev`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'default' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(3, {
          action: 'delete',
          id: `${id}:prev`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
        expect(mockSoClient.bulkDelete).toHaveBeenNthCalledWith(
          4,
          [
            {
              id: `${id}-myspace:prev`,
              type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
          { force: true, namespace: 'myspace' }
        );
        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(4, {
          action: 'delete',
          id: `${id}-myspace:prev`,
          savedObjectType: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        });
      });
    });
  });
});

describe('_applyIndexPrivileges()', () => {
  function createPackageStream(indexPrivileges?: string[]): RegistryDataStream {
    const stream: RegistryDataStream = {
      type: '',
      dataset: '',
      title: '',
      // @ts-ignore-error
      release: '',
      package: '',
      path: '',
    };

    if (indexPrivileges) {
      stream.elasticsearch = {
        privileges: {
          indices: indexPrivileges,
        },
      };
    }

    return stream;
  }

  function createInputStream(
    opts: Partial<PackagePolicyInputStream> = {}
  ): PackagePolicyInputStream {
    return {
      id: '',
      enabled: true,
      data_stream: {
        dataset: '',
        type: '',
      },
      ...opts,
    };
  }

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should do nothing if packageStream has no privileges', () => {
    const packageStream = createPackageStream();
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should apply dynamic_dataset', () => {
    const packageStream = createPackageStream();
    packageStream.elasticsearch = { dynamic_dataset: true };
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          dynamic_dataset: true,
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });

  it('should apply dynamic_namespace', () => {
    const packageStream = createPackageStream();
    packageStream.elasticsearch = { dynamic_namespace: true };
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          dynamic_namespace: true,
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });

  it('should not apply privileges if all privileges are forbidden', () => {
    const forbiddenPrivileges = ['write', 'delete', 'delete_index', 'all'];
    const packageStream = createPackageStream(forbiddenPrivileges);
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should not apply privileges if all privileges are unrecognized', () => {
    const unrecognizedPrivileges = ['idnotexist', 'invalidperm'];
    const packageStream = createPackageStream(unrecognizedPrivileges);
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should apply privileges if all privileges are valid', () => {
    const validPrivileges = [
      'auto_configure',
      'create_doc',
      'maintenance',
      'monitor',
      'read',
      'read_cross_cluster',
    ];

    const packageStream = createPackageStream(validPrivileges);
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          privileges: {
            indices: validPrivileges,
          },
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });

  it('should only apply valid privileges when there is a  mix of valid and invalid', () => {
    const mixedPrivileges = ['auto_configure', 'read_cross_cluster', 'idontexist', 'delete'];

    const packageStream = createPackageStream(mixedPrivileges);
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          privileges: {
            indices: ['auto_configure', 'read_cross_cluster'],
          },
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });

  it('should apply correct privileges for serverless', () => {
    appContextService.start(createAppContextStartContractMock({}, true));
    const mixedPrivileges = [
      'create_doc',
      'auto_configure',
      'read_cross_cluster',
      'idontexist',
      'delete',
    ];

    const packageStream = createPackageStream(mixedPrivileges);
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          privileges: {
            indices: ['create_doc', 'auto_configure'],
          },
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });
});

describe('_validateRestrictedFieldsNotModifiedOrThrow()', () => {
  const pkgInfo = {
    name: 'custom_logs',
    title: 'Custom Logs',
    version: '1.0.0',
    type: 'input',
  } as any as PackageInfo;

  const createInputPkgPolicy = (opts: { namespace: string; dataset: string }) => {
    const { namespace, dataset } = opts;
    return {
      id: 'id-1234',
      version: 'WzI1MywxXQ==',
      name: 'custom_logs-1',
      namespace,
      description: '',
      enabled: true,
      policy_id: '1234',
      policy_ids: ['1234'],
      revision: 1,
      created_at: '2023-01-04T14:51:53.061Z',
      created_by: 'elastic',
      updated_at: '2023-01-04T14:51:53.061Z',
      updated_by: 'elastic',
      vars: {},
      inputs: [
        {
          type: 'logfile',
          policy_template: 'logs',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'custom_logs.logs',
              },
              vars: {
                'data_stream.dataset': {
                  type: 'text',
                  value: dataset,
                },
              },
              id: 'logfile-custom_logs.logs-1',
            },
          ],
        },
      ],
      package: {
        name: 'custom_logs',
        title: 'Custom Logs',
        version: '1.0.0',
      },
    };
  };
  it('should not throw if restricted fields are not modified', () => {
    const oldPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'custom_logs.logs',
    });
    expect(() =>
      _validateRestrictedFieldsNotModifiedOrThrow({
        oldPackagePolicy,
        packagePolicyUpdate: oldPackagePolicy,
        pkgInfo,
      })
    ).not.toThrow();
  });

  it('should throw if namespace is modified', () => {
    const oldPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'custom_logs.logs',
    });
    const newPackagePolicy = createInputPkgPolicy({
      namespace: 'new-namespace',
      dataset: 'custom_logs.logs',
    });
    expect(() =>
      _validateRestrictedFieldsNotModifiedOrThrow({
        oldPackagePolicy,
        packagePolicyUpdate: newPackagePolicy,
        pkgInfo,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Package policy namespace cannot be modified for input only packages, please create a new package policy."`
    );
  });

  it('should throw if dataset is modified', () => {
    const oldPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'custom_logs.logs',
    });
    const newPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'new-dataset',
    });
    expect(() =>
      _validateRestrictedFieldsNotModifiedOrThrow({
        oldPackagePolicy,
        packagePolicyUpdate: newPackagePolicy,
        pkgInfo,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Package policy dataset cannot be modified for input only packages, please create a new package policy."`
    );
  });

  it('should not throw if dataset is modified but package is integration package', () => {
    const oldPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'custom_logs.logs',
    });
    const newPackagePolicy = createInputPkgPolicy({
      namespace: 'default',
      dataset: 'new-dataset',
    });
    expect(() =>
      _validateRestrictedFieldsNotModifiedOrThrow({
        oldPackagePolicy,
        packagePolicyUpdate: newPackagePolicy,
        pkgInfo: { ...pkgInfo, type: 'integration' },
      })
    ).not.toThrow();
  });
});

describe('_normalizePackagePolicyKuery', () => {
  it('should work for ingest-agent-policies.attributes with space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `ingest-package-policies.attributes.name:test`
    );
    expect(res).toEqual('fleet-package-policies.attributes.name:test');
  });

  it('should work for ingest-agent-policies.attributes without space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `ingest-package-policies.attributes.name:test`
    );
    expect(res).toEqual('ingest-package-policies.attributes.name:test');
  });

  it('should work for ingest-agent-policies with space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `ingest-package-policies.name:test`
    );
    expect(res).toEqual('fleet-package-policies.attributes.name:test');
  });

  it('should work for ingest-agent-policies without space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `ingest-package-policies.name:test`
    );
    expect(res).toEqual('ingest-package-policies.attributes.name:test');
  });

  it('should work for fleet-agent-policies.attributes with space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `fleet-package-policies.attributes.name:test`
    );
    expect(res).toEqual('fleet-package-policies.attributes.name:test');
  });

  it('should work for fleet-agent-policies.attributes without space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `fleet-package-policies.attributes.name:test`
    );
    expect(res).toEqual('ingest-package-policies.attributes.name:test');
  });

  it('should work for fleet-agent-policies with space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `fleet-package-policies.name:test`
    );
    expect(res).toEqual('fleet-package-policies.attributes.name:test');
  });

  it('should work for fleet-agent-policies without space awareness enabled', () => {
    const res = _normalizePackagePolicyKuery(
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      `fleet-package-policies.name:test`
    );
    expect(res).toEqual('ingest-package-policies.attributes.name:test');
  });
});

describe('_getAssetForTemplatePath()', () => {
  it('should return the asset for the given template path', () => {
    const pkgInfo: PackageInfo = {
      name: 'test_package',
      version: '1.0.0',
      type: 'integration',
    } as any;
    const datasetPath = 'test_data_stream';
    const templatePath = 'log.yml.hbs';
    const assetsMap: AssetsMap = new Map();
    assetsMap.set(
      `test_package-1.0.0/data_stream/${datasetPath}/agent/stream/syslog.yml.hbs`,
      Buffer.from('wrong match asset')
    );
    assetsMap.set(
      `test_package-1.0.0/data_stream/${datasetPath}/agent/stream/log.yml.hbs`,
      Buffer.from('exact match asset')
    );

    const expectedAsset: ArchiveEntry = {
      path: 'test_package-1.0.0/data_stream/test_data_stream/agent/stream/log.yml.hbs',
      buffer: Buffer.from('exact match asset'),
    };
    const asset = _getAssetForTemplatePath(pkgInfo, assetsMap, datasetPath, templatePath);
    expect(asset).toEqual(expectedAsset);
  });
  it('should return fallback asset it exact match is not found', () => {
    // representing the scenario where the templatePath has the default value 'stream.yml.hbs'
    // but the actual asset uses a prefixed name like 'filestream.yml.hbs'
    const pkgInfo: PackageInfo = {
      name: 'test_package',
      version: '1.0.0',
      type: 'integration',
    } as any;
    const datasetPath = 'test_data_stream';
    const templatePath = 'stream.yml.hbs';
    const assetsMap: AssetsMap = new Map();
    assetsMap.set(
      `test_package-1.0.0/data_stream/${datasetPath}/agent/stream/filestream.yml.hbs`,
      Buffer.from('ends with match asset')
    );

    const expectedFallbackAsset: ArchiveEntry = {
      path: 'test_package-1.0.0/data_stream/test_data_stream/agent/stream/filestream.yml.hbs',
      buffer: Buffer.from('ends with match asset'),
    };
    const asset = _getAssetForTemplatePath(pkgInfo, assetsMap, datasetPath, templatePath);
    expect(asset).toEqual(expectedFallbackAsset);
  });
});
