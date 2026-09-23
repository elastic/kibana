/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { Logger } from '@kbn/logging';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import {
  RESERVED_CONFIG_YML_KEYS,
  SERVERLESS_DEFAULT_OUTPUT_ID,
  SERVERLESS_PRIVATE_OUTPUT_ID,
} from '../../common/constants';
import type { OutputSOAttributes } from '../types';
import type { NewElasticsearchOutput } from '../../common/types';
import { OUTPUT_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';

import { outputService, outputIdToUuid } from './output';
import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import { packagePolicyService } from './package_policy';
import { auditLoggingService } from './audit_logging';
import { findAgentlessPolicies, checkOtlpOutputAllowed } from './outputs/helpers';
import { outputSavedObjectToOutput } from './output';
import {
  extractAndWriteOutputSecrets,
  extractAndUpdateOutputSecrets,
  isOutputSecretStorageEnabled,
} from './secrets';

jest.mock('./app_context');
jest.mock('./agent_policy');
jest.mock('./package_policy');
jest.mock('./audit_logging');
jest.mock('./secrets');
jest.mock('./outputs/helpers');

const mockedFindAgentlessPolicies = findAgentlessPolicies as jest.MockedFunction<
  typeof findAgentlessPolicies
>;
const mockedCheckOtlpOutputAllowed = checkOtlpOutputAllowed as jest.MockedFunction<
  typeof checkOtlpOutputAllowed
>;

const mockedExtractAndWriteOutputSecrets = extractAndWriteOutputSecrets as jest.MockedFunction<
  typeof extractAndWriteOutputSecrets
>;
const mockedExtractAndUpdateOutputSecrets = extractAndUpdateOutputSecrets as jest.MockedFunction<
  typeof extractAndUpdateOutputSecrets
>;
const mockedIsOutputSecretStorageEnabled = isOutputSecretStorageEnabled as jest.MockedFunction<
  typeof isOutputSecretStorageEnabled
>;

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;
mockedAppContextService.getLogger.mockImplementation(() => {
  return mockedLogger;
});

mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

const CLOUD_ID =
  'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';

const CONFIG_WITH_ES_HOSTS = {
  enabled: true,
  agents: {
    enabled: true,
    elasticsearch: {
      hosts: ['http://host1.com'],
    },
  },
};

const CONFIG_WITHOUT_ES_HOSTS = {
  enabled: true,
  agents: {
    enabled: true,
    elasticsearch: {},
  },
};

function mockOutputSO(id: string, attributes: any = {}, updatedAt?: string) {
  return {
    id: outputIdToUuid(id),
    type: 'ingest-outputs',
    references: [],
    attributes: {
      name: 'Test',
      output_id: id,
      ...attributes,
    },
    updated_at: updatedAt,
  };
}

function getMockedSoClient(
  options: { defaultOutputId?: string; defaultOutputMonitoringId?: string } = {}
) {
  const soClient = savedObjectsClientMock.create();

  soClient.get.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case outputIdToUuid('output-test'): {
        return mockOutputSO('output-test');
      }
      case outputIdToUuid('existing-default-output'): {
        return mockOutputSO('existing-default-output');
      }
      case outputIdToUuid('existing-default-monitoring-output'): {
        return mockOutputSO('existing-default-monitoring-output', {
          is_default: true,
          type: 'elasticsearch',
        });
      }
      case outputIdToUuid('existing-default-and-default-monitoring-output'): {
        return mockOutputSO('existing-default-and-default-monitoring-output', {
          is_default: true,
          is_default_monitoring: true,
        });
      }
      case outputIdToUuid('existing-preconfigured-default-output'): {
        return mockOutputSO('existing-preconfigured-default-output', {
          is_default: true,
          is_preconfigured: true,
        });
      }

      case outputIdToUuid(
        'existing-preconfigured-default-output-allow-edit-write-to-logs-streams'
      ): {
        return mockOutputSO(
          'existing-preconfigured-default-output-allow-edit-write-to-logs-streams',
          {
            is_default: true,
            is_preconfigured: true,
            allow_edit: ['write_to_logs_streams'],
          }
        );
      }

      case outputIdToUuid('existing-preconfigured-default-output-allow-edit-name'): {
        return mockOutputSO('existing-preconfigured-default-output-allow-edit-name', {
          name: 'test',
          allow_edit: ['name'],
        });
      }

      case outputIdToUuid('existing-logstash-output'): {
        return mockOutputSO('existing-logstash-output', {
          type: 'logstash',
          is_default: false,
        });
      }

      case outputIdToUuid('existing-logstash-output-with-ssl'): {
        return mockOutputSO('existing-logstash-output-with-ssl', {
          type: 'logstash',
          is_default: false,
          ssl: {
            certificate: 'cert-value',
            certificate_authorities: ['/path/to/CAs'],
          },
          secrets: {
            ssl: {
              key: {
                id: 'wnES3pUBqsj3cVixODPG',
              },
            },
          },
        });
      }

      case outputIdToUuid('existing-preconfigured-logstash-output'): {
        return mockOutputSO('existing-preconfigured-logstash-output', {
          type: 'logstash',
          is_default: false,
          is_preconfigured: true,
        });
      }

      case outputIdToUuid('existing-kafka-output'): {
        return mockOutputSO('existing-kafka-output', {
          type: 'kafka',
          is_default: false,
        });
      }

      case outputIdToUuid('existing-es-output'): {
        return mockOutputSO('existing-es-output', {
          type: 'elasticsearch',
          is_default: false,
          write_to_logs_streams: false,
        });
      }

      case outputIdToUuid('existing-remote-es-output'): {
        return mockOutputSO('existing-remote-es-output', {
          type: 'remote_elasticsearch',
          is_default: false,
          service_token: 'plain',
        });
      }

      case outputIdToUuid('existing-otlp-output'): {
        return mockOutputSO('existing-otlp-output', {
          type: 'otlp',
          is_default: false,
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4317',
            protocol: 'grpc',
            compression: 'gzip',
            timeout: '30s',
          },
        });
      }

      default:
        return mockOutputSO(id, {
          type: 'remote_elasticsearch',
        });
    }
  });
  soClient.update.mockImplementation(async (type, id, data) => {
    return {
      id,
      type,
      attributes: {},
      references: [],
    };
  });
  soClient.create.mockImplementation(async (type, data, createOptions) => {
    return {
      id: createOptions?.id || 'generated-id',
      type,
      attributes: {},
      references: [],
    };
  });
  soClient.find.mockImplementation(async (findOptions) => {
    if (
      options?.defaultOutputMonitoringId &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('is_default_monitoring') &&
      findOptions.search === 'true'
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClient.get(
              'ingest-outputs',
              outputIdToUuid(options.defaultOutputMonitoringId)
            )),
          },
        ],
        total: 1,
      };
    }

    if (
      options?.defaultOutputId &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('is_default') &&
      findOptions.search === 'true'
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClient.get('ingest-outputs', outputIdToUuid(options.defaultOutputId))),
          },
        ],
        total: 1,
      };
    }

    return {
      page: 1,
      per_page: 10,
      saved_objects: [],
      total: 0,
    };
  });

  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClient);
  mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient);

  return soClient;
}

function getMockedEncryptedSoClient() {
  const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  };

  esoClientMock.getDecryptedAsInternalUser.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case outputIdToUuid('output-test'): {
        return mockOutputSO('output-test');
      }
      case outputIdToUuid('existing-default-output'): {
        return mockOutputSO('existing-default-output');
      }
      case outputIdToUuid('existing-default-monitoring-output'): {
        return mockOutputSO('existing-default-monitoring-output', {
          is_default: true,
          type: 'elasticsearch',
        });
      }
      case outputIdToUuid('existing-default-and-default-monitoring-output'): {
        return mockOutputSO('existing-default-and-default-monitoring-output', {
          is_default: true,
          is_default_monitoring: true,
        });
      }
      case outputIdToUuid('existing-preconfigured-default-output'): {
        return mockOutputSO('existing-preconfigured-default-output', {
          is_default: true,
          is_preconfigured: true,
        });
      }
      case outputIdToUuid('existing-preconfigured-default-output-allow-edit-name'): {
        return mockOutputSO('existing-preconfigured-default-output-allow-edit-name', {
          name: 'test',
          allow_edit: ['name'],
        });
      }
      case outputIdToUuid('existing-logstash-output'): {
        return mockOutputSO('existing-logstash-output', {
          type: 'logstash',
          is_default: false,
        });
      }
      case outputIdToUuid('existing-logstash-output-with-ssl'): {
        return mockOutputSO('existing-logstash-output-with-ssl', {
          type: 'logstash',
          is_default: false,
          ssl: {
            certificate: 'cert-value',
            certificate_authorities: ['/path/to/CAs'],
          },
          secrets: {
            ssl: {
              key: {
                id: 'wnES3pUBqsj3cVixODPG',
              },
            },
          },
        });
      }
      case outputIdToUuid('existing-preconfigured-logstash-output'): {
        return mockOutputSO('existing-preconfigured-logstash-output', {
          type: 'logstash',
          is_default: false,
          is_preconfigured: true,
        });
      }
      case outputIdToUuid('existing-kafka-output'): {
        return mockOutputSO('existing-kafka-output', {
          type: 'kafka',
          is_default: false,
        });
      }
      case outputIdToUuid('existing-es-output'): {
        return mockOutputSO('existing-es-output', {
          type: 'elasticsearch',
          is_default: false,
          write_to_logs_streams: false,
        });
      }
      case outputIdToUuid('existing-remote-es-output'): {
        return mockOutputSO('existing-remote-es-output', {
          type: 'remote_elasticsearch',
          is_default: false,
          service_token: 'plain',
        });
      }
      case outputIdToUuid('existing-otlp-output'): {
        return mockOutputSO('existing-otlp-output', {
          type: 'otlp',
          is_default: false,
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4317',
            protocol: 'grpc',
            compression: 'gzip',
            timeout: '30s',
          },
          secrets: {},
        });
      }
      default:
        return mockOutputSO(id, {
          type: 'remote_elasticsearch',
        });
    }
  });

  mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

  return esoClientMock;
}

describe('Output Service', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const esoClientMock = getMockedEncryptedSoClient();

  const mockedAgentPolicyWithFleetServerResolvedValue = {
    items: [
      {
        name: 'fleet server policy',
        id: 'fleet_server_policy',
        is_default_fleet_server: true,
        package_policies: [
          {
            name: 'fleet-server-123',
            package: {
              name: 'fleet_server',
            },
          },
        ],
      },
      {
        name: 'agent policy 1',
        id: 'agent_policy_1',
        is_managed: false,
        package_policies: [
          {
            name: 'nginx',
            package: {
              name: 'nginx',
            },
          },
        ],
      },
    ],
  } as unknown as ReturnType<typeof mockedAgentPolicyService.list>;

  const mockedPackagePolicyWithFleetServerResolvedValue = {
    items: [
      {
        name: 'fleet-server-123',
        policy_ids: ['fleet_server_policy'],
        package: {
          name: 'fleet_server',
        },
      },
    ],
  } as unknown as ReturnType<typeof mockedPackagePolicyService.list>;

  const mockedAgentPolicyWithSyntheticsResolvedValue = {
    items: [
      {
        name: 'synthetics policy',
        id: 'synthetics_policy',
        package_policies: [
          {
            name: 'synthetics-123',
            package: {
              name: 'synthetics',
            },
          },
        ],
      },
      {
        name: 'agent policy 1',
        id: 'agent_policy_1',
        is_managed: false,
        package_policies: [
          {
            name: 'nginx',
            package: {
              name: 'nginx',
            },
          },
        ],
      },
    ],
  } as unknown as ReturnType<typeof mockedAgentPolicyService.list>;

  const mockedPackagePolicyWithSyntheticsResolvedValue = {
    items: [
      {
        name: 'synthetics-123',
        policy_ids: ['synthetics_policy'],
        package: {
          name: 'synthetics',
        },
      },
    ],
  } as unknown as ReturnType<typeof mockedPackagePolicyService.list>;

  const mockedAgentlessPolicyResolvedValue = {
    items: [
      {
        name: 'agentless policy',
        id: 'agentless_policy',
        supports_agentless: true,
        package_policies: [
          {
            name: 'elastic_connectors',
            package: {
              name: 'elastic_connectors',
            },
          },
        ],
      },
    ],
  } as unknown as ReturnType<typeof mockedAgentPolicyService.list>;

  beforeEach(() => {
    mockedAgentPolicyService.getByIds.mockResolvedValue([]);
    mockedAgentPolicyService.list.mockClear();
    mockedPackagePolicyService.list.mockReset();
    mockedPackagePolicyService.fetchAllItems.mockReset();
    mockedAgentPolicyService.hasAPMIntegration.mockClear();
    mockedAgentPolicyService.hasFleetServerIntegration.mockClear();
    mockedAgentPolicyService.hasSyntheticsIntegration.mockClear();
    mockedAgentPolicyService.removeOutputFromAll.mockReset();
    mockedPackagePolicyService.removeOutputFromAll.mockReset();
    mockedAppContextService.getInternalUserSOClient.mockReset();
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReset();
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
    mockedAgentPolicyService.update.mockReset();
    mockedPackagePolicyService.list.mockResolvedValue({
      items: [],
    } as any);
    mockedPackagePolicyService.fetchAllItems.mockResolvedValue((async function* () {})());
    mockedFindAgentlessPolicies.mockResolvedValue([]);
    mockedCheckOtlpOutputAllowed.mockResolvedValue({ result: true });
    mockedIsOutputSecretStorageEnabled.mockResolvedValue(false);
  });

  afterEach(() => {
    mockedAgentPolicyService.getByIds.mockClear();
  });

  describe('create', () => {
    describe('elasticsearch output', () => {
      beforeEach(() => {
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
      });

      it('should throw if encryptedSavedObject is not configured', async () => {
        const soClient = getMockedSoClient();
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: false,
        } as any);

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test',
              type: 'elasticsearch',
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow(`elasticsearch output needs encrypted saved object api key to be set`);
      });

      it('works with a predefined id', async () => {
        const soClient = getMockedSoClient();

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(soClient.create).toHaveBeenCalled();

        // ID should always be the same for a predefined id
        expect(soClient.create.mock.calls[0][2]?.id).toEqual(outputIdToUuid('output-test'));
        expect((soClient.create.mock.calls[0][1] as OutputSOAttributes).output_id).toEqual(
          'output-test'
        );
      });

      it('should create a new default output if none exists before', async () => {
        const soClient = getMockedSoClient();

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(soClient.update).not.toHaveBeenCalled();
      });

      it('should update existing default output when creating a new default output', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'existing-default-output',
        });

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(soClient.update).toHaveBeenCalledTimes(1);
        expect(soClient.update).toHaveBeenCalledWith(
          expect.anything(),
          outputIdToUuid('existing-default-output'),
          { is_default: false }
        );
      });

      it('should create a new default monitoring output if none exists before', async () => {
        const soClient = getMockedSoClient();

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: true,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(soClient.update).not.toHaveBeenCalled();
      });

      it('should update existing default monitoring output when creating a new default output', async () => {
        const soClient = getMockedSoClient({
          defaultOutputMonitoringId: 'existing-default-monitoring-output',
        });

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: true,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(soClient.update).toHaveBeenCalledTimes(1);
        expect(soClient.update).toHaveBeenCalledWith(
          expect.anything(),
          outputIdToUuid('existing-default-monitoring-output'),
          { is_default_monitoring: false }
        );
      });

      it('should call audit logger', async () => {
        const soClient = getMockedSoClient();

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: true,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        );

        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
          action: 'create',
          id: outputIdToUuid('output-test'),
          name: 'Test',
          savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
        });
      });

      it('should set preset: balanced by default when creating a new ES output', async () => {
        const soClient = getMockedSoClient({});

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          {
            id: 'output-1',
          }
        );

        expect(soClient.create).toHaveBeenCalledWith(
          OUTPUT_SAVED_OBJECT_TYPE,
          // Preset should be inferred as balanced if not provided
          expect.objectContaining({
            preset: 'balanced',
          }),
          expect.anything()
        );
      });

      it('should set preset: balanced by default when creating a new remote ES output', async () => {
        const soClient = getMockedSoClient({});
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'remote_elasticsearch',
          },
          {
            id: 'output-1',
          }
        );

        expect(soClient.create).toHaveBeenCalledWith(
          OUTPUT_SAVED_OBJECT_TYPE,
          // Preset should be inferred as balanced if not provided
          expect.objectContaining({
            preset: 'balanced',
          }),
          expect.anything()
        );
      });

      it('should set preset: custom when config_yaml contains a reserved key', async () => {
        const soClient = getMockedSoClient({});

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
            config_yaml: `
              bulk_max_size: 1000
            `,
          },
          {
            id: 'output-1',
          }
        );

        expect(soClient.create).toHaveBeenCalledWith(
          OUTPUT_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            preset: 'custom',
          }),
          expect.anything()
        );
      });

      it('should honor preset: custom in attributes', async () => {
        const soClient = getMockedSoClient({});

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
            config_yaml: `
              some_non_reserved_key: foo
            `,
            preset: 'custom',
          },
          {
            id: 'output-1',
          }
        );

        expect(soClient.create).toHaveBeenCalledWith(
          OUTPUT_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            preset: 'custom',
          }),
          expect.anything()
        );
      });

      it('should throw an error when preset: balanced is provided but config_yaml contains a reserved key', async () => {
        const soClient = getMockedSoClient({});

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test',
              type: 'elasticsearch',
              config_yaml: `
              bulk_max_size: 1000
            `,
              preset: 'balanced',
            },
            {
              id: 'output-1',
            }
          )
        ).rejects.toThrow(
          `preset cannot be balanced when config_yaml contains one of ${RESERVED_CONFIG_YML_KEYS.join(
            ', '
          )}`
        );

        expect(soClient.create).not.toHaveBeenCalled();
      });

      // With preconfigured outputs
      it('should throw when an existing preconfigured default output and creating a new default output outside of preconfiguration', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'existing-preconfigured-default-output',
        });

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: true,
              is_default_monitoring: false,
              name: 'Test',
              type: 'elasticsearch',
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow(
          `Preconfigured output existing-preconfigured-default-output is_default cannot be updated outside of kibana config file.`
        );
      });

      it('should update existing default preconfigured monitoring output when creating a new default output from preconfiguration', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'existing-preconfigured-default-output',
        });

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: true,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test', fromPreconfiguration: true }
        );

        expect(soClient.update).toHaveBeenCalledTimes(1);
        expect(soClient.update).toHaveBeenCalledWith(
          expect.anything(),
          outputIdToUuid('existing-preconfigured-default-output'),
          { is_default: false }
        );
      });
    });

    describe('logstash output', () => {
      it('should throw if encryptedSavedObject is not configured', async () => {
        const soClient = getMockedSoClient({});

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test',
              type: 'logstash',
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow(`logstash output needs encrypted saved object api key to be set`);
      });

      it('should work if encryptedSavedObject is configured', async () => {
        const soClient = getMockedSoClient({});
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-test' }
        );
        expect(soClient.create).toHaveBeenCalled();
      });

      it('should update fleet server policies with data_output_id=default_output_id if a new default logstash output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
        mockedPackagePolicyService.list.mockResolvedValue(
          mockedPackagePolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentPolicyWithFleetServerResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'fleet_server_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should update synthetics policies with data_output_id=default_output_id if a new default logstash output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithSyntheticsResolvedValue
        );
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
        mockedPackagePolicyService.list.mockResolvedValue(
          mockedPackagePolicyWithSyntheticsResolvedValue
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentPolicyWithSyntheticsResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'synthetics_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should update agentless policies with data_output_id=default_output_id if a new default logstash output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
        mockedFindAgentlessPolicies.mockResolvedValueOnce(
          (await mockedAgentlessPolicyResolvedValue).items
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentlessPolicyResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'agentless_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should allow to create a new logstash output with no errors if is not set as default', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-1' }
        );
      });

      it('should store output secrets as plain text if disabled', async () => {
        const soClient = getMockedSoClient({});
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
            ssl: {
              certificate: 'xxx',
            },
            secrets: {
              ssl: {
                key: 'secretKey',
              },
            },
          },
          { id: 'output-test' }
        );
        expect(soClient.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ssl: JSON.stringify({ certificate: 'xxx', key: 'secretKey' }),
          }),
          expect.anything()
        );
      });
    });

    describe('kafka output', () => {
      it('should throw if encryptedSavedObject is not configured', async () => {
        const soClient = getMockedSoClient({});

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test',
              type: 'kafka',
              topic: 'test',
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow(`kafka output needs encrypted saved object api key to be set`);
      });

      it('should update fleet server policies with data_output_id=default_output_id if a new default kafka output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
        mockedPackagePolicyService.list.mockResolvedValue(
          mockedPackagePolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentPolicyWithFleetServerResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'kafka',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'fleet_server_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should update synthetics policies with data_output_id=default_output_id if a new default kafka output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithSyntheticsResolvedValue
        );
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
        mockedPackagePolicyService.list.mockResolvedValue(
          mockedPackagePolicyWithSyntheticsResolvedValue
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentPolicyWithSyntheticsResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'kafka',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'synthetics_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should update agentless policies with data_output_id=default_output_id if a new default kafka output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
        mockedFindAgentlessPolicies.mockResolvedValueOnce(
          (await mockedAgentlessPolicyResolvedValue).items
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentlessPolicyResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'kafka',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'agentless_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });

      it('should allow to create a new kafka output with no errors if is not set as default', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'kafka',
          },
          { id: 'output-1' }
        );
      });

      it('should clear proxy_id when creating a kafka output that has proxy_id set', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(
          mockedAgentPolicyWithFleetServerResolvedValue
        );
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'kafka',
            proxy_id: 'proxy-1',
          },
          { id: 'output-1' }
        );

        expect(soClient.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ proxy_id: null }),
          expect.anything()
        );
      });
    });

    describe('remote elasticsearch output', () => {
      beforeEach(() => {
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
      });
      it('should throw if encryptedSavedObject is not configured', async () => {
        const soClient = getMockedSoClient();
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: false,
        } as any);

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: true,
              is_default_monitoring: false,
              name: 'Test',
              type: 'remote_elasticsearch',
            },
            { id: 'output-1' }
          )
        ).rejects.toThrow(
          `remote_elasticsearch output needs encrypted saved object api key to be set`
        );
      });

      it('should update agentless policies with data_output_id=default_output_id if a new default remote es output is created', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
        mockedFindAgentlessPolicies.mockResolvedValueOnce(
          (await mockedAgentlessPolicyResolvedValue).items
        );
        mockedAgentPolicyService.getByIds.mockResolvedValue(
          (await mockedAgentlessPolicyResolvedValue).items
        );

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'remote_elasticsearch',
          },
          { id: 'output-1' }
        );

        expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'agentless_policy',
          { data_output_id: 'output-test' },
          { force: false }
        );
      });
      it('should not throw when a remote es output is attempted to be created as default data output', async () => {
        const soClient = getMockedSoClient({
          defaultOutputId: 'output-test',
        });

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: true,
              is_default_monitoring: false,
              name: 'Test',
              type: 'remote_elasticsearch',
            },
            { id: 'output-1' }
          )
        ).resolves.not.toThrow();
      });
    });

    describe('otlp output', () => {
      beforeEach(() => {
        mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
          canEncrypt: true,
        } as any);
        mockedAppContextService.getExperimentalFeatures.mockReturnValue({
          enableOtlpOutput: true,
        } as any);
        mockedExtractAndWriteOutputSecrets.mockResolvedValue({ output: { type: 'otlp' } } as any);
        mockedIsOutputSecretStorageEnabled.mockResolvedValue(true);
      });

      afterEach(() => {
        mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
      });

      it('should throw if OTLP output type is not enabled', async () => {
        const soClient = getMockedSoClient();
        mockedCheckOtlpOutputAllowed.mockResolvedValueOnce({
          result: false,
          error: 'OTLP output type is not enabled',
        });

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test OTLP',
              type: 'otlp',
              otlp_exporter: {
                endpoint: 'https://otel.example.com:4317',
                protocol: 'grpc',
              },
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow('OTLP output type is not enabled');
      });

      it('should throw if the Fleet Server version requirement is not met', async () => {
        const soClient = getMockedSoClient();
        mockedCheckOtlpOutputAllowed.mockResolvedValueOnce({
          result: false,
          error: 'OTLP output requires all Fleet Servers to be on version 9.6.0 or later.',
        });

        await expect(
          outputService.create(
            soClient,
            esClientMock,
            {
              is_default: false,
              is_default_monitoring: false,
              name: 'Test OTLP',
              type: 'otlp',
              otlp_exporter: {
                endpoint: 'https://otel.example.com:4317',
                protocol: 'grpc',
              },
            },
            { id: 'output-test' }
          )
        ).rejects.toThrow('9.6.0 or later');
      });

      it('should create an otlp output and persist otlp_exporter config', async () => {
        const soClient = getMockedSoClient();
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test OTLP',
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4317',
              protocol: 'grpc',
            },
          },
          { id: 'output-test' }
        );

        expect(soClient.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4317',
              protocol: 'grpc',
            },
          }),
          expect.anything()
        );
      });

      it('should always write tls secrets as fleet-secret refs regardless of storage state', async () => {
        const soClient = getMockedSoClient();
        mockedAgentPolicyService.list.mockResolvedValue({ items: [] } as any);
        mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
        mockedExtractAndWriteOutputSecrets.mockResolvedValueOnce({
          output: {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test OTLP secrets',
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: { id: 'key-pem-secret-id' },
                  tpm: {
                    owner_auth: { id: 'owner-auth-secret-id' },
                    auth: { id: 'auth-secret-id' },
                  },
                },
              },
            },
          },
        } as any);

        await outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test OTLP secrets',
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4317',
              protocol: 'grpc',
            },
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: 'my-key-pem',
                  tpm: { owner_auth: 'my-owner-auth', auth: 'my-auth' },
                },
              },
            },
          },
          { id: 'output-test' }
        );

        expect(soClient.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'otlp',
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: { id: 'key-pem-secret-id' },
                  tpm: {
                    owner_auth: { id: 'owner-auth-secret-id' },
                    auth: { id: 'auth-secret-id' },
                  },
                },
              },
            },
          }),
          expect.anything()
        );
        expect(soClient.create).not.toBeCalledWith(
          expect.anything(),
          expect.objectContaining({ otlp_exporter_secrets: expect.anything() }),
          expect.anything()
        );
      });
    });

    it('should throw FleetError when given an invalid id', async () => {
      const soClient = getMockedSoClient();

      await expect(
        outputService.create(
          soClient,
          esClientMock,
          { is_default: false, is_default_monitoring: false, name: 'Test', type: 'elasticsearch' },
          { id: '../bad-id' }
        )
      ).rejects.toThrow('id is not valid');
    });
  });

  describe('serverless validation', () => {
    const DEFAULT_HOST = 'http://elasticsearch:9200';
    const PRIVATE_HOST = 'https://abc.es.private.us-east-1.aws.elastic.cloud';
    let savedEsoImpl: ((...args: any[]) => any) | undefined;

    beforeEach(() => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: true } as any);
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: true,
      } as any);
      savedEsoImpl = esoClientMock.getDecryptedAsInternalUser.getMockImplementation();
      esoClientMock.getDecryptedAsInternalUser.mockImplementation(async (type, id) => {
        if (id === outputIdToUuid(SERVERLESS_DEFAULT_OUTPUT_ID)) {
          return mockOutputSO(SERVERLESS_DEFAULT_OUTPUT_ID, {
            type: 'elasticsearch',
            hosts: [DEFAULT_HOST],
          });
        }
        if (id === outputIdToUuid(SERVERLESS_PRIVATE_OUTPUT_ID)) {
          return mockOutputSO(SERVERLESS_PRIVATE_OUTPUT_ID, {
            type: 'elasticsearch',
            hosts: [PRIVATE_HOST],
          });
        }
        if (id === outputIdToUuid('existing-default-output')) {
          return mockOutputSO('existing-default-output', {
            type: 'elasticsearch',
            hosts: [DEFAULT_HOST],
          });
        }
        return savedEsoImpl!(type, id);
      });
    });

    afterEach(() => {
      mockedAppContextService.getCloud.mockReset();
      if (savedEsoImpl) {
        esoClientMock.getDecryptedAsInternalUser.mockImplementation(savedEsoImpl);
      }
    });

    function makeSoClientWithServerlessOutputs({
      privateExists = true,
    }: { privateExists?: boolean } = {}) {
      const soClient = getMockedSoClient();
      const handleId = async (id: string) => {
        if (id === outputIdToUuid(SERVERLESS_DEFAULT_OUTPUT_ID)) {
          return mockOutputSO(SERVERLESS_DEFAULT_OUTPUT_ID, {
            type: 'elasticsearch',
            hosts: [DEFAULT_HOST],
          });
        }
        if (id === outputIdToUuid(SERVERLESS_PRIVATE_OUTPUT_ID)) {
          if (!privateExists) {
            throw SavedObjectsErrorHelpers.createGenericNotFoundError(
              'output',
              SERVERLESS_PRIVATE_OUTPUT_ID
            );
          }
          return mockOutputSO(SERVERLESS_PRIVATE_OUTPUT_ID, {
            type: 'elasticsearch',
            hosts: [PRIVATE_HOST],
          });
        }
        return mockOutputSO('existing-default-output', {
          type: 'elasticsearch',
          hosts: [DEFAULT_HOST],
        });
      };
      soClient.get.mockImplementation(async (_type: string, id: string) => handleId(id));
      esoClientMock.getDecryptedAsInternalUser.mockImplementation(async (_type, id) =>
        handleId(id)
      );
      return soClient;
    }

    it('rejects create when elasticsearch hosts differ from default in serverless', async () => {
      const soClient = makeSoClientWithServerlessOutputs();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
          hosts: ['http://localhost:8080'],
        })
      ).rejects.toThrow(
        `Elasticsearch output host must have default URL in serverless: ${DEFAULT_HOST}`
      );
    });

    it('allows create when elasticsearch hosts match default in serverless', async () => {
      const soClient = makeSoClientWithServerlessOutputs();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
          hosts: [DEFAULT_HOST],
        })
      ).resolves.toBeDefined();
    });

    it('rejects update when elasticsearch hosts differ from default in serverless', async () => {
      const soClient = makeSoClientWithServerlessOutputs();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-default-output', {
          hosts: ['http://localhost:8080'],
        })
      ).rejects.toThrow(
        `Elasticsearch output host must have default URL in serverless: ${DEFAULT_HOST}`
      );
    });

    describe('private endpoint (PrivateLink) validation', () => {
      it('rejects create when elasticsearch hosts match private endpoint in serverless (non-preconfigured output)', async () => {
        const soClient = makeSoClientWithServerlessOutputs();
        await expect(
          outputService.create(soClient, esClientMock, {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
            hosts: [PRIVATE_HOST],
          })
        ).rejects.toThrow(
          `Elasticsearch output host must have default URL in serverless: ${DEFAULT_HOST}`
        );
      });

      it('rejects create when hosts use the private URL and private endpoint SO is absent', async () => {
        const soClient = makeSoClientWithServerlessOutputs({ privateExists: false });
        await expect(
          outputService.create(soClient, esClientMock, {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
            hosts: [PRIVATE_HOST],
          })
        ).rejects.toThrow(
          `Elasticsearch output host must have default URL in serverless: ${DEFAULT_HOST}`
        );
      });

      it('rejects update when hosts match private endpoint but output is not the preconfigured private output', async () => {
        const soClient = makeSoClientWithServerlessOutputs();
        await expect(
          outputService.update(soClient, esClientMock, 'existing-default-output', {
            hosts: [PRIVATE_HOST],
          })
        ).rejects.toThrow(
          `Elasticsearch output host must have default URL in serverless: ${DEFAULT_HOST}`
        );
      });

      it('allows update when hosts match private endpoint and output is the preconfigured private output', async () => {
        const soClient = makeSoClientWithServerlessOutputs();
        await outputService.update(soClient, esClientMock, SERVERLESS_PRIVATE_OUTPUT_ID, {
          hosts: [PRIVATE_HOST],
        });
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          `Updated output ${SERVERLESS_PRIVATE_OUTPUT_ID}`
        );
      });
    });
  });
  describe('input validation', () => {
    it('rejects create when both ssl.key and secrets.ssl.key are provided for elasticsearch output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
          ssl: { key: 'plaintext-key' } as any,
          secrets: { ssl: { key: 'secret-key' } },
        })
      ).rejects.toThrow('Cannot specify both ssl.key and secrets.ssl.key');
    });

    it('rejects create when both ssl.key and secrets.ssl.key are provided for remote_elasticsearch output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'remote_elasticsearch',
          ssl: { key: 'plaintext-key' } as any,
          secrets: { ssl: { key: 'secret-key' } },
        })
      ).rejects.toThrow('Cannot specify both ssl.key and secrets.ssl.key');
    });

    it('rejects create when both service_token and secrets.service_token are provided for remote_elasticsearch output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'remote_elasticsearch',
          service_token: 'token1',
          secrets: { service_token: 'token2' },
        })
      ).rejects.toThrow('Cannot specify both service_token and secrets.service_token');
    });

    it('rejects create when ssl.certificate_authorities contains a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
          ssl: { certificate_authorities: ['/path with spaces/ca.pem'] } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects create when ssl.certificate is a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
          hosts: ['0.0.0.0:5044'],
          ssl: { certificate: '/path with spaces/cert.pem' } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects create when ssl.key is a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
          hosts: ['0.0.0.0:5044'],
          ssl: { key: '/path with spaces/key.pem' } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects create when secrets.ssl.key is a string path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
          hosts: ['0.0.0.0:5044'],
          secrets: { ssl: { key: '/path with spaces/key.pem' } } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('does not apply ssl path validation when secrets.ssl.key is a { id } secret reference', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      // { id } SOSecret references must be skipped by the path validator — they are not file paths.
      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        secrets: { ssl: { key: { id: 'wnES3pUBqsj3cVixODPG' } } } as any,
      });
      expect(soClient.update).toBeCalled();
    });

    it('rejects update when ssl.certificate_authorities contains a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          ssl: { certificate_authorities: ['/path with spaces/ca.pem'] } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects update when ssl.certificate is a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          ssl: { certificate: '/path with spaces/cert.pem' } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects update when ssl.key is a path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          ssl: { key: '/path with spaces/key.pem' } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects update when secrets.ssl.key is a string path with whitespace', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          secrets: { ssl: { key: '/path with spaces/key.pem' } } as any,
        })
      ).rejects.toThrow('SSL certificate path cannot contain whitespace');
    });

    it('rejects create when both password and secrets.password are provided for kafka output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.create(soClient, esClientMock, {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'kafka',
          hosts: ['localhost:9092'],
          password: 'plaintext-password',
          secrets: { password: 'secret-password' },
        })
      ).rejects.toThrow('Cannot specify both password and secrets.password');
    });

    it('rejects update when both ssl.key and secrets.ssl.key are provided', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          ssl: { key: 'plaintext-key' } as any,
          secrets: { ssl: { key: 'secret-key' } },
        })
      ).rejects.toThrow('Cannot specify both ssl.key and secrets.ssl.key');
    });

    it('rejects update when both password and secrets.password are provided for kafka output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-kafka-output', {
          password: 'plaintext-password',
          secrets: { password: 'secret-password' },
        })
      ).rejects.toThrow('Cannot specify both password and secrets.password');
    });

    it('rejects update when both service_token and secrets.service_token are provided for remote_elasticsearch output', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-remote-es-output', {
          service_token: 'token1',
          secrets: { service_token: 'token2' },
        })
      ).rejects.toThrow('Cannot specify both service_token and secrets.service_token');
    });

    it('bypasses ssl path validation for preconfigured create and logs a warning', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: true,
      } as any);
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        esClientMock,
        {
          is_default: false,
          is_default_monitoring: false,
          name: 'Preconfigured logstash',
          type: 'logstash',
          hosts: ['0.0.0.0:5044'],
          ssl: { certificate: '/path with spaces/cert.pem' } as any,
        },
        { fromPreconfiguration: true }
      );

      expect(mockedLogger.warn).toBeCalledWith(
        expect.stringContaining('Preconfigured output failed validation')
      );
      expect(soClient.create).toBeCalled();
    });

    it('bypasses ssl path validation for preconfigured update and logs a warning', async () => {
      mockedAppContextService.getCloud.mockReturnValue({ isServerlessEnabled: false } as any);
      const soClient = getMockedSoClient();

      await outputService.update(
        soClient,
        esClientMock,
        'existing-preconfigured-logstash-output',
        { ssl: { certificate: '/path with spaces/cert.pem' } } as any,
        { fromPreconfiguration: true }
      );

      expect(mockedLogger.warn).toBeCalledWith(
        expect.stringContaining('Preconfigured output failed validation')
      );
      expect(soClient.update).toBeCalled();
    });
  });

  describe('update', () => {
    it('should update existing default output when updating an output to become the default output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'output-test', {
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('output-test'),
        {
          is_default: true,
        }
      );
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: false }
      );
    });

    it('should not update existing default output when the output is already the default one', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-default-output', {
        is_default: true,
        name: 'Test',
      });

      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: true, name: 'Test' }
      );
    });

    it('should not set default output to false when the output is already the default one', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-and-default-monitoring-output',
      });

      await expect(
        outputService.update(
          soClient,
          esClientMock,
          'existing-default-and-default-monitoring-output',
          {
            is_default: false,
            name: 'Test',
          }
        )
      ).rejects.toThrow(
        `Default output existing-default-and-default-monitoring-output cannot be set to is_default=false or is_default_monitoring=false manually. Make another output the default first.`
      );
    });

    it('should not set default monitoring output to false when the output is already the default one', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-and-default-monitoring-output',
      });

      await expect(
        outputService.update(
          soClient,
          esClientMock,
          'existing-default-and-default-monitoring-output',
          {
            is_default_monitoring: false,
            name: 'Test',
          }
        )
      ).rejects.toThrow(
        `Default output existing-default-and-default-monitoring-output cannot be set to is_default=false or is_default_monitoring=false manually. Make another output the default first.`
      );
    });

    it('should update existing default monitoring output when updating an output to become the default monitoring output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputMonitoringId: 'existing-default-monitoring-output',
      });

      await outputService.update(soClient, esClientMock, 'output-test', {
        is_default_monitoring: true,
      });

      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('output-test'),
        {
          is_default_monitoring: true,
        }
      );
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-monitoring-output'),
        { is_default_monitoring: false }
      );
    });

    // With preconfigured outputs
    it('Do not allow to update a preconfigured output outside from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-preconfigured-default-output', {
          config_yaml: 'test: 123',
        })
      ).rejects.toThrow(
        'Preconfigured output existing-preconfigured-default-output config_yaml cannot be updated outside of kibana config file.'
      );
    });

    it('should allow to update write_to_logs_streams field in preconfigured output outside from preconfiguration if allow_edits is set', async () => {
      const soClient = getMockedSoClient();
      await outputService.update(
        soClient,
        esClientMock,
        'existing-preconfigured-default-output-allow-edit-write-to-logs-streams',
        {
          write_to_logs_streams: true,
          ssl: { certificate: '', certificate_authorities: [] },
        }
      );
      expect(soClient.update).toHaveBeenCalled();
    });

    it('Allow to update a preconfigured output from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.update(
        soClient,
        esClientMock,
        'existing-preconfigured-default-output',
        {
          config_yaml: '',
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalled();
    });

    it('Allow to update preconfigured output allowed to edit field from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
      await outputService.update(
        soClient,
        esClientMock,
        'existing-preconfigured-default-output-allow-edit-name',
        {
          name: 'test 123',
        },
        {
          fromPreconfiguration: false,
        }
      );

      expect(soClient.update).toHaveBeenCalled();
    });

    it('Should throw when an existing preconfigured default output and updating an output to become the default one outside of preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await expect(
        outputService.update(soClient, esClientMock, 'output-test', {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        })
      ).rejects.toThrow(
        `Preconfigured output existing-preconfigured-default-output is_default cannot be updated outside of kibana config file.`
      );
    });

    it('Should update existing default preconfigured monitoring output when updating an output to become the default one from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        },
        { fromPreconfiguration: true }
      );

      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: false }
      );
    });

    // With ES output
    it('Should delete Logstash specific fields if the output type change to ES', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
        preset: 'balanced',
      });
    });

    it('Should delete Kafka specific fields if the output type change to ES', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-kafka-output', {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
        auth_type: null,
        connection_type: null,
        broker_timeout: null,
        required_acks: null,
        client_id: null,
        compression: null,
        compression_level: null,
        hash: null,
        key: null,
        partition: null,
        password: null,
        random: null,
        round_robin: null,
        sasl: null,
        ssl: null,
        timeout: null,
        topic: null,
        headers: null,
        username: null,
        version: null,
        preset: 'balanced',
      });
    });

    it('should recompute preset when config_yaml is included in a same-type elasticsearch update', async () => {
      const soClient = getMockedSoClient({});

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        config_yaml: 'logging.level: warning',
      });

      // config_yaml !== undefined triggers recompute even without a type change (item 1 fix).
      // No explicit `type` in the update data proves mergedType is resolved from the stored output (item 4).
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ config_yaml: 'logging.level: warning', preset: 'balanced' })
      );
    });

    it('should not add a preset when config_yaml is absent from a partial elasticsearch update', async () => {
      const soClient = getMockedSoClient({});

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        name: 'Renamed ES',
      });

      // Preset must not be computed when config_yaml is absent — doing so would clobber a
      // stored 'custom' preset with 'balanced' on any innocuous rename.
      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        type: 'elasticsearch',
        name: 'Renamed ES',
      });
    });

    it('should clear proxy_id when updating a kafka output that has proxy_id set', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-kafka-output', {
        proxy_id: 'proxy-1',
        name: 'updated kafka',
      });

      expect(soClient.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ proxy_id: null })
      );
    });

    // With logstash output
    it('Should work if you try to make that output the default output and no policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalled();
    });

    it('Should call update with null fields if', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        config_yaml: null,
        ssl: null,
      });

      expect(soClient.update).toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        config_yaml: null,
        ssl: null,
        type: 'logstash',
      });
    });

    it('Should throw if you try to make that output the default output and some policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          is_default: true,
        })
      ).rejects.toThrow(`Logstash output cannot be used with APM integration.`);
    });

    it('Should delete ES specific fields if the output type changes to logstash', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        type: 'logstash',
        hosts: ['test:4343'],
        write_to_logs_streams: false,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        otel_disable_beatsauth: null,
        otel_exporter_config_yaml: null,
        write_to_logs_streams: null,
      });
    });

    it('Should delete Kafka specific fields if the output type changes to logstash', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);

      await outputService.update(soClient, esClientMock, 'existing-kafka-output', {
        type: 'logstash',
        hosts: ['test:4343'],
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        auth_type: null,
        connection_type: null,
        broker_timeout: null,
        required_acks: null,
        client_id: null,
        compression: null,
        compression_level: null,
        hash: null,
        ssl: null,
        key: null,
        partition: null,
        password: null,
        random: null,
        round_robin: null,
        sasl: null,
        timeout: null,
        topic: null,
        headers: null,
        username: null,
        version: null,
      });
    });

    it('Should update fleet server policies with data_output_id=default_output_id if a default ES output is changed to logstash', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(
        mockedAgentPolicyWithFleetServerResolvedValue
      );
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithFleetServerResolvedValue
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('Should update fleet server policies with data_output_id=default_output_id and force=true if a default ES output is changed to logstash, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(
        mockedAgentPolicyWithFleetServerResolvedValue
      );
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithFleetServerResolvedValue
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'logstash',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('should update synthetics policies with data_output_id=default_output_id if a default ES output is changed to logstash', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentPolicyWithSyntheticsResolvedValue);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithSyntheticsResolvedValue
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'synthetics_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('should update synthetics policies with data_output_id=default_output_id and force=true if a default ES output is changed to logstash, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentPolicyWithSyntheticsResolvedValue);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithSyntheticsResolvedValue
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'logstash',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'synthetics_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('should update agentless policies with data_output_id=default_output_id if a default ES output is changed to logstash', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('should update agentless policies with data_output_id=default_output_id and force=true if a default ES output is changed to logstash, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'logstash',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('Should return an error if trying to change the output to logstash for fleet server policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue(
        mockedAgentPolicyWithFleetServerResolvedValue
      );
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithFleetServerResolvedValue
      );

      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'logstash',
          hosts: ['test:4343'],
        })
      ).rejects.toThrow(
        'Logstash output cannot be used with Fleet Server integration in fleet server policy. Please create a new Elasticsearch output.'
      );
    });

    it('Should return an error if trying to change the output to logstash for synthetics policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentPolicyWithSyntheticsResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithSyntheticsResolvedValue
      );

      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'logstash',
          hosts: ['test:4343'],
        })
      ).rejects.toThrow(
        'Logstash output cannot be used with Synthetics integration in synthetics policy. Please create a new Elasticsearch output.'
      );
    });

    it('Should return an error if trying to change the output to logstash for agentless policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );
      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'logstash',
          hosts: ['test:4343'],
        })
      ).rejects.toThrow(
        'Logstash output cannot be used with agentless integration in agentless policy. Please create a new Elasticsearch output.'
      );
    });

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient({ defaultOutputId: 'existing-es-output' });

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        hosts: ['new-host:443'],
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'update',
        name: 'Test',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    });

    // With Kafka output
    it('Should delete ES specific fields if the output type changes to kafka', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [],
      } as any);

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        type: 'kafka',
        hosts: ['test:4343'],
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        broker_timeout: 10,
        required_acks: 1,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        otel_disable_beatsauth: null,
        otel_exporter_config_yaml: null,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        write_to_logs_streams: null,
        proxy_id: null,
      });
    });

    it('Should delete Logstash specific fields if the output type changes to kafka', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [],
      } as any);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        type: 'kafka',
        hosts: ['test:4343'],
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        hosts: ['test:4343'],
        broker_timeout: 10,
        required_acks: 1,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        type: 'kafka',
        version: '1.0.0',
        proxy_id: null,
      });
    });

    it('Should update fleet server policies with data_output_id=default_output_id if a default ES output is changed to kafka', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(
        mockedAgentPolicyWithFleetServerResolvedValue
      );
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithFleetServerResolvedValue
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('Should update fleet server policies with data_output_id=default_output_id and force=true if a default ES output is changed to kafka, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(
        mockedAgentPolicyWithFleetServerResolvedValue
      );
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithFleetServerResolvedValue
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'kafka',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('should update synthetics policies with data_output_id=default_output_id if a default ES output is changed to kafka', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentPolicyWithSyntheticsResolvedValue);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithSyntheticsResolvedValue
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'synthetics_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('should update synthetics policies with data_output_id=default_output_id and force=true if a default ES output is changed to kafka, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentPolicyWithSyntheticsResolvedValue);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(true);
      mockedPackagePolicyService.list.mockResolvedValue(
        mockedPackagePolicyWithSyntheticsResolvedValue
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'kafka',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'synthetics_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('should update agentless policies with data_output_id=default_output_id if a default ES output is changed to kafka', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('should update agentless policies with data_output_id=default_output_id and force=true if a default ES output is changed to kafka, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'kafka',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'kafka',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        password: null,
        username: null,
        ssl: null,
        sasl: null,
        client_id: 'Elastic',
        compression: 'gzip',
        compression_level: 4,
        partition: 'hash',
        timeout: 30,
        version: '1.0.0',
        broker_timeout: 10,
        required_acks: 1,
        proxy_id: null,
      });
      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('Should return an error if trying to change the output to kafka for agentless policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );
      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'kafka',
          hosts: ['test:4343'],
        })
      ).rejects.toThrow(
        'Kafka output cannot be used with agentless integration in agentless policy. Please create a new Elasticsearch output.'
      );
    });

    // remote ES
    it('should not throw when a remote es output is attempted to be updated as default data output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });

      await expect(
        outputService.update(soClient, esClientMock, 'output-test', {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'remote_elasticsearch',
        })
      ).resolves.not.toThrow();
    });

    it('Should delete service_token if updated remote es output does not have a value', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-remote-es-output', {
        type: 'remote_elasticsearch',
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'remote_elasticsearch',
        kibana_api_key: null,
        service_token: null,
      });
    });

    it('should update agentless policies with data_output_id=default_output_id if a default ES output is changed to remote ES', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'remote_elasticsearch',
        is_default: true,
      });

      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('should update agentless policies with data_output_id=default_output_id and force=true if a default ES output is changed to remote ES, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'remote_elasticsearch',
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'agentless_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('Should return an error if trying to change the output to remote es for agentless policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue(mockedAgentlessPolicyResolvedValue);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);
      mockedFindAgentlessPolicies.mockResolvedValueOnce(
        (await mockedAgentlessPolicyResolvedValue).items
      );
      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'remote_elasticsearch',
        })
      ).rejects.toThrow(
        'Remote_elasticsearch output cannot be used with agentless integration in agentless policy. Please create a new Elasticsearch output.'
      );
    });

    it('Should delete SSL fields if SSL field is null', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [],
      } as any);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output-with-ssl', {
        type: 'logstash',
        hosts: ['0.0.0.0'],
        ssl: null,
      });

      expect(soClient.update).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['0.0.0.0'],
        ssl: null,
      });
    });

    describe('otlp output', () => {
      beforeEach(() => {
        mockedAppContextService.getExperimentalFeatures.mockReturnValue({
          enableOtlpOutput: true,
        } as any);
        mockedAgentPolicyService.list.mockResolvedValue({ items: [] } as any);
        mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
        mockedExtractAndUpdateOutputSecrets.mockResolvedValue({
          secretsToDelete: [],
          outputUpdate: {},
        } as any);
        mockedIsOutputSecretStorageEnabled.mockResolvedValue(true);
      });

      afterEach(() => {
        mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
      });

      it('Should throw if OTLP output type is not enabled on update', async () => {
        const soClient = getMockedSoClient({});
        mockedCheckOtlpOutputAllowed.mockResolvedValueOnce({
          result: false,
          error: 'OTLP output type is not enabled',
        });

        await expect(
          outputService.update(soClient, esClientMock, 'existing-otlp-output', {
            name: 'Updated OTLP',
          })
        ).rejects.toThrow('OTLP output type is not enabled');
      });

      it('Should throw if the Fleet Server version requirement is not met when switching type to OTLP', async () => {
        const soClient = getMockedSoClient({});
        mockedCheckOtlpOutputAllowed.mockResolvedValueOnce({
          result: false,
          error: 'OTLP output requires all Fleet Servers to be on version 9.6.0 or later.',
        });

        await expect(
          outputService.update(soClient, esClientMock, 'existing-es-output', {
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4317',
              protocol: 'grpc',
            },
          })
        ).rejects.toThrow('9.6.0 or later');
      });

      it('Should throw when updating an OTLP output used by a policy with non-OTel inputs', async () => {
        const soClient = getMockedSoClient({});
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [{ id: 'mixed-policy', name: 'Mixed Policy' }],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedAgentPolicyService.getByIds.mockResolvedValue([]);
        mockedPackagePolicyService.fetchAllItems.mockResolvedValue(
          (async function* () {
            yield [
              {
                policy_ids: ['mixed-policy'],
                inputs: [{ type: 'logfile', enabled: true }],
              } as any,
            ];
          })()
        );

        // is_default: true changes is_default, which triggers validateTypeChanges for the OTLP path
        await expect(
          outputService.update(soClient, esClientMock, 'existing-otlp-output', {
            is_default: true,
          })
        ).rejects.toThrow(
          'OTLP output cannot be used with agent policy "Mixed Policy" because it contains non-OTel inputs.'
        );
      });

      it('Should clear beats fields when changing an ES output to OTLP', async () => {
        const soClient = getMockedSoClient({});
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [{ id: 'policy-id' }],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedAgentPolicyService.getByIds.mockResolvedValue([]);
        mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);

        await outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'otlp',
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4317',
            protocol: 'grpc',
          },
        });

        expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
          type: 'otlp',
          otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
          hosts: null,
          ca_sha256: null,
          ca_trusted_fingerprint: null,
          config_yaml: null,
          ssl: null,
          shipper: null,
          preset: null,
          proxy_id: null,
          write_to_logs_streams: null,
          otel_exporter_config_yaml: null,
          otel_disable_beatsauth: null,
        });
      });

      it('Should clear otlp_exporter when changing an OTLP output to ES', async () => {
        const soClient = getMockedSoClient({});
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [{}],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);
        mockedAgentPolicyService.hasSyntheticsIntegration.mockReturnValue(false);

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          type: 'elasticsearch',
          hosts: ['http://test:9200'],
        });

        expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
          type: 'elasticsearch',
          hosts: ['http://test:9200'],
          otlp_exporter: null,
          preset: 'balanced',
        });
      });

      it('Should preserve otlp_exporter on a same-type OTLP update', async () => {
        const soClient = getMockedSoClient({});

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://new.example.com:4317',
            protocol: 'grpc',
          },
        });

        expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
          type: 'otlp',
          otlp_exporter: { endpoint: 'https://new.example.com:4317', protocol: 'grpc' },
        });

        mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
      });

      it('Should null gRPC-exclusive fields when switching an OTLP output from gRPC to HTTP', async () => {
        const soClient = getMockedSoClient({});

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4318',
            protocol: 'http/protobuf',
          },
        });

        expect(soClient.update).toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            otlp_exporter: expect.objectContaining({
              protocol: 'http/protobuf',
              balancer_name: null,
              keepalive: null,
              wait_for_ready: null,
              user_agent: null,
              authority: null,
            }),
          })
        );
      });

      it('Should null HTTP-exclusive fields when switching an OTLP output from HTTP to gRPC', async () => {
        const soClient = getMockedSoClient({});
        // Override the stored output to be an HTTP exporter for this one call
        esoClientMock.getDecryptedAsInternalUser.mockResolvedValueOnce(
          mockOutputSO('existing-otlp-output', {
            type: 'otlp',
            is_default: false,
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4318',
              protocol: 'http/protobuf',
              traces_endpoint: 'https://otel.example.com:4318/v1/traces',
              encoding: 'proto',
            },
          })
        );
        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4317',
            protocol: 'grpc',
          },
        });

        expect(soClient.update).toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            otlp_exporter: expect.objectContaining({
              protocol: 'grpc',
              encoding: null,
              traces_endpoint: null,
              metrics_endpoint: null,
              logs_endpoint: null,
              profiles_endpoint: null,
              proxy_url: null,
              max_idle_conns: null,
              max_idle_conns_per_host: null,
              max_conns_per_host: null,
              idle_conn_timeout: null,
              disable_keep_alives: null,
              http2_read_idle_timeout: null,
              http2_ping_timeout: null,
              force_attempt_http2: null,
              compression_params: null,
              cookies: null,
            }),
          })
        );
      });

      it('Should null gRPC-only compression when switching from gRPC with snappy/zstd to HTTP', async () => {
        const soClient = getMockedSoClient({});
        // Override the stored output to have a gRPC-only compression value
        esoClientMock.getDecryptedAsInternalUser.mockResolvedValueOnce(
          mockOutputSO('existing-otlp-output', {
            type: 'otlp',
            is_default: false,
            otlp_exporter: {
              endpoint: 'https://otel.example.com:4317',
              protocol: 'grpc',
              compression: 'zstd',
            },
          })
        );

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4318',
            protocol: 'http/protobuf',
          },
        });

        expect(soClient.update).toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            otlp_exporter: expect.objectContaining({
              protocol: 'http/protobuf',
              compression: null,
            }),
          })
        );
      });

      it('Should propagate a null container to soClient.update untouched on OTLP partial update', async () => {
        const soClient = getMockedSoClient({});

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://otel.example.com:4317',
            protocol: 'grpc',
            tls: null,
          },
        });

        expect(soClient.update).toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            otlp_exporter: expect.objectContaining({ tls: null }),
          })
        );
      });

      it('accepts an OTLP update when the using policy has no package policies', async () => {
        const soClient = getMockedSoClient({});
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [{ id: 'empty-policy', name: 'Empty Policy' }],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedAgentPolicyService.getByIds.mockResolvedValue([]);
        mockedPackagePolicyService.fetchAllItems.mockImplementation(() =>
          Promise.resolve((async function* () {})())
        );

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          is_default: true,
        });

        expect(soClient.update).toBeCalled();
      });

      it('accepts an OTLP update when all using policies have only OTel inputs', async () => {
        const soClient = getMockedSoClient({});
        mockedAgentPolicyService.list.mockResolvedValue({
          items: [{ id: 'otel-policy', name: 'OTel Policy' }],
        } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
        mockedAgentPolicyService.getByIds.mockResolvedValue([]);
        mockedPackagePolicyService.fetchAllItems.mockImplementation(() =>
          Promise.resolve(
            (async function* () {
              yield [
                {
                  policy_ids: ['otel-policy'],
                  inputs: [{ type: 'otelcol', enabled: true }],
                } as any,
              ];
            })()
          )
        );

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          is_default: true,
        });

        expect(soClient.update).toBeCalled();
      });

      it('Should always write tls secrets as fleet-secret refs regardless of storage state', async () => {
        const soClient = getMockedSoClient({});
        mockedExtractAndUpdateOutputSecrets.mockResolvedValueOnce({
          secretsToDelete: [],
          outputUpdate: {
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://new.example.com:4317', protocol: 'grpc' },
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: { id: 'updated-key-pem-secret-id' },
                  tpm: {
                    owner_auth: { id: 'updated-owner-auth-secret-id' },
                    auth: { id: 'updated-auth-secret-id' },
                  },
                },
              },
            },
          },
        } as any);

        await outputService.update(soClient, esClientMock, 'existing-otlp-output', {
          otlp_exporter: {
            endpoint: 'https://new.example.com:4317',
            protocol: 'grpc',
          },
          secrets: {
            otlp_exporter: {
              tls: {
                key_pem: 'updated-key-pem',
                tpm: { owner_auth: 'updated-owner-auth', auth: 'updated-auth' },
              },
            },
          },
        });

        expect(soClient.update).toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            type: 'otlp',
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: { id: 'updated-key-pem-secret-id' },
                  tpm: {
                    owner_auth: { id: 'updated-owner-auth-secret-id' },
                    auth: { id: 'updated-auth-secret-id' },
                  },
                },
              },
            },
          })
        );
        expect(soClient.update).not.toBeCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ otlp_exporter_secrets: expect.anything() })
        );
      });
    });
  });

  describe('delete', () => {
    // Preconfigured output
    it('Do not allow to delete a preconfigured output outisde from preconfiguration', async () => {
      await expect(outputService.delete('existing-preconfigured-default-output')).rejects.toThrow(
        'Preconfigured output existing-preconfigured-default-output cannot be deleted outside of kibana config file.'
      );
    });

    it('Allow to delete a preconfigured output from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete('existing-preconfigured-default-output', {
        fromPreconfiguration: true,
      });

      expect(soClient.delete).toHaveBeenCalled();
    });

    it('Call removeOutputFromAll before deleting the output', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete('output-test');
      expect(mockedAgentPolicyService.removeOutputFromAll).toHaveBeenCalledWith(
        undefined,
        'output-test',
        {
          force: false,
        }
      );
      expect(mockedPackagePolicyService.removeOutputFromAll).toHaveBeenCalledWith(
        undefined,
        'output-test',
        {
          force: false,
        }
      );
      expect(soClient.delete).toHaveBeenCalled();
    });

    it('Call removeOutputFromAll with with force before deleting the output, if deleted from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete('existing-preconfigured-default-output', {
        fromPreconfiguration: true,
      });
      expect(mockedAgentPolicyService.removeOutputFromAll).toHaveBeenCalledWith(
        undefined,
        'existing-preconfigured-default-output',
        {
          force: true,
        }
      );
      expect(mockedPackagePolicyService.removeOutputFromAll).toHaveBeenCalledWith(
        undefined,
        'existing-preconfigured-default-output',
        {
          force: true,
        }
      );
      expect(soClient.delete).toHaveBeenCalled();
    });

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete('existing-es-output');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'delete',
        name: 'Test',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
      expect(soClient.delete).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('work with a predefined id', async () => {
      const output = await outputService.get('output-test');

      expect(esoClientMock.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        'ingest-outputs',
        outputIdToUuid('output-test')
      );

      expect(output.id).toEqual('output-test');
    });

    it('should call audit logger', async () => {
      await outputService.get('existing-es-output');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'get',
        name: 'Test',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('bulkGet', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should decrypt and return multiple outputs', async () => {
      const esoClient = getMockedEncryptedSoClient();

      esoClient.getDecryptedAsInternalUser
        .mockResolvedValueOnce({
          id: outputIdToUuid('output-1'),
          type: OUTPUT_SAVED_OBJECT_TYPE,
          attributes: { name: 'Output 1', output_id: 'output-1' },
          references: [],
        } as any)
        .mockResolvedValueOnce({
          id: outputIdToUuid('output-2'),
          type: OUTPUT_SAVED_OBJECT_TYPE,
          attributes: { name: 'Output 2', output_id: 'output-2' },
          references: [],
        } as any);

      const outputs = await outputService.bulkGet(['output-1', 'output-2']);

      expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-1')
      );
      expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-2')
      );
      expect(outputs).toHaveLength(2);
      expect(outputs[0].id).toEqual('output-1');
      expect(outputs[1].id).toEqual('output-2');
    });

    it('should filter out not found errors when ignoreNotFound is true', async () => {
      const esoClient = getMockedEncryptedSoClient();

      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-2')
      );

      esoClient.getDecryptedAsInternalUser
        .mockResolvedValueOnce({
          id: outputIdToUuid('output-1'),
          type: OUTPUT_SAVED_OBJECT_TYPE,
          attributes: { name: 'Output 1', output_id: 'output-1' },
          references: [],
        } as any)
        .mockRejectedValueOnce(notFoundError);

      const outputs = await outputService.bulkGet(['output-1', 'output-2'], {
        ignoreNotFound: true,
      });

      expect(outputs).toHaveLength(1);
      expect(outputs[0].id).toEqual('output-1');
    });

    it('should throw error for not found when ignoreNotFound is false', async () => {
      const esoClient = getMockedEncryptedSoClient();

      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-1')
      );

      esoClient.getDecryptedAsInternalUser.mockRejectedValue(notFoundError);

      await expect(
        outputService.bulkGet(['output-1'], { ignoreNotFound: false } as any)
      ).rejects.toThrow();
    });

    it('should handle decryption errors when ignoreNotFound is true', async () => {
      const esoClient = getMockedEncryptedSoClient();

      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-1')
      );
      esoClient.getDecryptedAsInternalUser.mockRejectedValue(notFoundError);

      const outputs = await outputService.bulkGet(['output-1'], {
        ignoreNotFound: true,
      });

      expect(outputs).toHaveLength(0);
    });

    it('should throw decryption errors when ignoreNotFound is false', async () => {
      const esoClient = getMockedEncryptedSoClient();

      const decryptionError = new Error('Decryption failed');
      esoClient.getDecryptedAsInternalUser.mockRejectedValue(decryptionError);

      await expect(
        outputService.bulkGet(['output-1'], { ignoreNotFound: false } as any)
      ).rejects.toThrow('Decryption failed');
    });

    it('should return empty array when ids is empty', async () => {
      const esoClient = getMockedEncryptedSoClient();

      const outputs = await outputService.bulkGet([]);

      expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(outputs).toEqual([]);
    });
  });

  describe('ensureDefaultOutput', () => {
    beforeEach(() => {
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);
    });

    it('returns the existing default output via targeted queries without decrypting all outputs', async () => {
      const soClient = getMockedSoClient({ defaultOutputId: 'existing-default-output' });

      const output = await outputService.ensureDefaultOutput(soClient, esClientMock);

      expect(output.id).toEqual('existing-default-output');
      expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('getDefaultDataOutputId', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      const defaultId = await outputService.getDefaultDataOutputId();

      expect(soClient.find).toHaveBeenCalled();

      expect(defaultId).toEqual('output-test');
    });
  });

  describe('getDefaultMonitoringOutputOd', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient({
        defaultOutputMonitoringId: 'output-test',
      });
      const defaultId = await outputService.getDefaultMonitoringOutputId();

      expect(soClient.find).toHaveBeenCalled();

      expect(defaultId).toEqual('output-test');
    });
  });

  describe('getDefaultESHosts', () => {
    afterEach(() => {
      mockedAppContextService.getConfig.mockReset();
      mockedAppContextService.getConfig.mockReset();
    });
    it('Should use cloud plugin as the source of truth for ES hosts', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: true,
        cloudId: CLOUD_ID,
        elasticsearchUrl: 'https://cec6f261a74bf24ce33bb8811b84294f.us-east-1.aws.found.io:443',
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITH_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual([
        'https://cec6f261a74bf24ce33bb8811b84294f.us-east-1.aws.found.io:443',
      ]);
    });

    it('Should use the value from the config if not in cloud', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: false,
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITH_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual(['http://host1.com']);
    });

    it('Should use the default value if there is no config', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: false,
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITHOUT_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual(['http://localhost:9200']);
    });
  });

  describe('getLatestOutputHealth', () => {
    let soClient: any;
    beforeEach(() => {
      soClient = getMockedSoClient();
    });

    it('should return unknown state if no hits', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      const response = await outputService.getLatestOutputHealth(esClientMock, 'id');

      expect(response).toEqual({
        state: 'UNKNOWN',
        message: '',
        timestamp: '',
      });
    });

    it('should return state from hits', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                state: 'DEGRADED',
                message: 'connection error',
                '@timestamp': '2023-11-30T14:25:31Z',
              },
            },
          ],
        },
      } as any);

      const response = await outputService.getLatestOutputHealth(esClientMock, 'id');

      expect(response).toEqual({
        state: 'DEGRADED',
        message: 'connection error',
        timestamp: '2023-11-30T14:25:31Z',
      });
    });

    it('should apply range filter if updated_at available', async () => {
      const updatedAt = '2023-11-30T14:25:31Z';
      soClient.get.mockResolvedValue(
        mockOutputSO(
          'id',
          {
            type: 'remote_elasticsearch',
          },
          updatedAt
        )
      );

      await outputService.getLatestOutputHealth(esClientMock, 'id');

      expect((esClientMock.search.mock.lastCall?.[0] as any)?.query.bool.must).toEqual([
        {
          range: {
            '@timestamp': {
              gte: updatedAt,
            },
          },
        },
      ]);
    });

    it('should not apply range filter if updated_at is not available', async () => {
      soClient.get.mockResolvedValue(
        mockOutputSO('id', {
          type: 'remote_elasticsearch',
        })
      );

      await outputService.getLatestOutputHealth(esClientMock, 'id');

      expect((esClientMock.search.mock.lastCall?.[0] as any)?.query.bool.must).toEqual([]);
    });

    it('should not apply range filter if output query returns error', async () => {
      soClient.get.mockResolvedValue({ error: { message: 'error' } });

      await outputService.getLatestOutputHealth(esClientMock, 'id');

      expect((esClientMock.search.mock.lastCall?.[0] as any)?.query.bool.must).toEqual([]);
    });
  });

  describe('backfillAllOutputPresets', () => {
    beforeEach(() => {
      // Ensure the encrypted saved objects client mock is set up
      mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);
      mockedAgentPolicyService.bumpAllAgentPoliciesForOutput.mockClear();
    });

    it('backfills the preset for ES outputs that are missing one without decrypting all outputs', async () => {
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
      const soClient = getMockedSoClient({});
      soClient.find.mockResolvedValue({
        page: 1,
        per_page: SO_SEARCH_LIMIT,
        total: 1,
        saved_objects: [
          {
            ...mockOutputSO('output-without-preset', {
              is_preconfigured: false,
              type: 'elasticsearch',
            }),
            score: 0,
          },
        ],
      });

      await expect(
        outputService.backfillAllOutputPresets(soClient, esClientMock)
      ).resolves.not.toThrow();

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OUTPUT_SAVED_OBJECT_TYPE,
          filter: expect.stringContaining('not ingest-outputs.attributes.preset:*'),
        })
      );
      expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledWith(
        OUTPUT_SAVED_OBJECT_TYPE,
        outputIdToUuid('output-without-preset'),
        expect.objectContaining({ preset: 'balanced' })
      );
      expect(mockedAgentPolicyService.bumpAllAgentPoliciesForOutput).toHaveBeenCalled();
    });

    it('exits early without updating anything when no outputs are missing a preset', async () => {
      mockedPackagePolicyService.list.mockResolvedValue({ items: [] } as any);
      const soClient = getMockedSoClient({});
      soClient.find.mockResolvedValue({
        page: 1,
        per_page: SO_SEARCH_LIMIT,
        total: 0,
        saved_objects: [],
      });

      await expect(
        outputService.backfillAllOutputPresets(soClient, esClientMock)
      ).resolves.not.toThrow();

      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockedAgentPolicyService.bumpAllAgentPoliciesForOutput).not.toHaveBeenCalled();
    });
  });

  describe('listPreconfigured', () => {
    it('should return only preconfigured outputs with secret fields stripped', async () => {
      const soClient = getMockedSoClient();
      soClient.find.mockResolvedValue({
        page: 1,
        per_page: 10000,
        total: 3,
        saved_objects: [
          {
            score: 0,
            ...mockOutputSO('preconfigured-es', {
              type: 'elasticsearch',
              is_preconfigured: true,
              ssl: 'encrypted-ciphertext',
            }),
          },
          {
            score: 0,
            ...mockOutputSO('non-preconfigured-es', {
              type: 'elasticsearch',
              is_preconfigured: false,
            }),
          },
          {
            score: 0,
            ...mockOutputSO('preconfigured-kafka', {
              type: 'kafka',
              is_preconfigured: true,
              password: 'encrypted-ciphertext',
              kibana_api_key: 'encrypted-ciphertext',
            }),
          },
        ],
      });

      const result = await outputService.listPreconfigured();

      expect(result.items).toHaveLength(2);
      expect(result.items.map((o) => o.id)).toEqual(
        expect.arrayContaining(['preconfigured-es', 'preconfigured-kafka'])
      );
      expect(result.items.find((o) => o.id === 'non-preconfigured-es')).toBeUndefined();

      for (const item of result.items) {
        expect(item).not.toHaveProperty('ssl');
        expect(item).not.toHaveProperty('password');
        expect(item).not.toHaveProperty('kibana_api_key');
      }
    });
  });

  describe('outputSavedObjectToOutput', () => {
    it('should return output object with parsed SSL when SSL is a valid JSON string', () => {
      const so = mockOutputSO('output-test', {
        type: 'elasticsearch',
        ssl: '{ "certificate": "cert", "key": "key" }',
      });

      const output = outputSavedObjectToOutput(so) as NewElasticsearchOutput;

      expect(output.ssl).toEqual({ certificate: 'cert', key: 'key' });
    });

    it('should return output object with no SSL field when SSL is an invalid JSON string', () => {
      const so = mockOutputSO('output-test', {
        type: 'elasticsearch',
        ssl: 'invalid-json',
      });

      const output = outputSavedObjectToOutput(so) as NewElasticsearchOutput;

      expect(output.ssl).toEqual(undefined);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Unable to parse ssl for output ${so.id}`)
      );
    });

    it('should return output object with no SSL field when SSL is not a string', () => {
      const so = mockOutputSO('output-test', {
        type: 'elasticsearch',
        ssl: { certificate: 'cert', key: 'key' },
      });

      const output = outputSavedObjectToOutput(so) as NewElasticsearchOutput;

      expect(output.ssl).toEqual(undefined);
    });
  });
});
