/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import { createSavedObjectClientMock } from '../mocks';
import {
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  DEFAULT_FLEET_SERVER_HOST_ID,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';

import { appContextService } from './app_context';
import { fleetServerHostService, migrateSettingsToFleetServerHost } from './fleet_server_host';
import { agentPolicyService } from './agent_policy';
import { getAgentsByKuery } from './agents';
import {
  deleteSecrets,
  extractAndUpdateFleetServerHostsSecrets,
  isSecretStorageEnabled,
} from './secrets';

jest.mock('./app_context');
jest.mock('./agent_policy');
jest.mock('./agents');
jest.mock('./secrets');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
let mockedLogger: jest.Mocked<Logger>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;

function getMockedSoClient(options?: { id?: string; findHosts?: boolean; findSettings?: boolean }) {
  const soClientMock = createSavedObjectClientMock();
  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClientMock);

  soClientMock.create.mockImplementation(async (type, data, createOptions) => {
    return {
      id: createOptions?.id || 'generated-id',
      type,
      attributes: {},
      references: [],
    };
  });

  soClientMock.find.mockImplementation(async ({ type }) => {
    if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
      if (options?.findHosts) {
        return {
          saved_objects: [
            {
              id: 'test123',
              attributes: { name: 'fleetServerHost', host_urls: [], is_default: true },
            },
          ],
        } as any;
      }
      return { saved_objects: [] } as any;
    }

    if (type === GLOBAL_SETTINGS_SAVED_OBJECT_TYPE) {
      if (options?.findSettings) {
        return {
          saved_objects: [
            {
              attributes: {
                fleet_server_hosts: ['https://fleetserver:8220'],
              },
            },
          ],
        } as any;
      }

      return {
        saved_objects: [],
      } as any;
    }

    if (
      type === LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE ||
      type === PACKAGE_POLICY_SAVED_OBJECT_TYPE
    ) {
      return {
        saved_objects: [
          {
            id: 'existing-package-policy',
            type: 'ingest-package-policies',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: {
              name: 'fleet-server',
              description: '',
              namespace: 'default',
              enabled: true,
              policy_id: 'fleet-server-id-1',
              policy_ids: ['fleet-server-id-1'],
              package: {
                name: 'fleet-server',
                title: 'Fleet Server',
                version: '0.9.0',
              },
              inputs: [],
            },
          },
        ],
      } as any;
    }
    throw new Error('Not mocked');
  });

  return soClientMock;
}

function getMockedEncryptedSoClient() {
  const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  };

  esoClientMock.getDecryptedAsInternalUser.mockImplementation(async (type: string, id: string) => {
    return {
      id: 'test1',
      attributes: {},
    } as any;
  });

  mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

  return esoClientMock;
}

describe('migrateSettingsToFleetServerHost', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: true,
    } as any);
  });

  const esMock = elasticsearchServiceMock.createInternalClient();

  it('should not migrate settings if a default fleet server policy config exists', async () => {
    const soClientMock = getMockedSoClient({ id: DEFAULT_FLEET_SERVER_HOST_ID, findHosts: true });
    await migrateSettingsToFleetServerHost(soClientMock, esMock);

    expect(soClientMock.create).not.toBeCalled();
  });

  it('should not migrate settings if there is no old settings', async () => {
    const soClientMock = getMockedSoClient({ id: DEFAULT_FLEET_SERVER_HOST_ID });
    mockedGetAgentsByKuery.mockResolvedValueOnce({ agents: [] } as any);

    await migrateSettingsToFleetServerHost(soClientMock, esMock);
    expect(soClientMock.create).not.toBeCalled();
  });

  it('should migrate settings to new saved object', async () => {
    const soClientMock = getMockedSoClient({ findSettings: true });
    getMockedEncryptedSoClient();

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: '1',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
        {
          id: '2',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
      ],
    } as any);

    await migrateSettingsToFleetServerHost(soClientMock, esMock);

    expect(soClientMock.create).toBeCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        is_default: true,
        host_urls: ['https://fleetserver:8220'],
      }),
      expect.objectContaining({
        id: DEFAULT_FLEET_SERVER_HOST_ID,
      })
    );
  });

  it('should not work if getEncryptedSavedObjectsSetup is not set', async () => {
    const soClientMock = getMockedSoClient({ findSettings: true });

    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: false,
    } as any);
    await expect(() => migrateSettingsToFleetServerHost(soClientMock, esMock)).rejects.toThrow(
      'Fleet server host needs encrypted saved object api key to be set'
    );
  });
});

describe('create', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: true,
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should throw if encryptedSavedObject is not configured', async () => {
    const soClientMock = getMockedSoClient();
    const esClientMock = elasticsearchServiceMock.createInternalClient();
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: false,
    } as any);

    await expect(
      fleetServerHostService.create(
        soClientMock,
        esClientMock,
        {
          name: 'Test',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
        },
        { id: 'output-test' }
      )
    ).rejects.toThrow(`Fleet server host needs encrypted saved object api key to be set`);
  });

  it('should throw FleetError when given an invalid id', async () => {
    const soClientMock = getMockedSoClient();
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    await expect(
      fleetServerHostService.create(
        soClientMock,
        esClientMock,
        { name: 'Test', host_urls: [], is_default: false, is_preconfigured: false },
        { id: '../bad-id' }
      )
    ).rejects.toThrow('id is not valid');
  });

  it('should undefault an existing preconfigured default host when creating a new default via API', async () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();
    const soClientMock = getMockedSoClient();
    const esoClientMock = getMockedEncryptedSoClient();

    (isSecretStorageEnabled as jest.Mock).mockResolvedValue(false);

    // getDefaultFleetServerHost() uses soClient.find — return a preconfigured default.
    soClientMock.find.mockImplementation(async ({ type }: any) => {
      if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [
            {
              id: 'preconfigured-default',
              attributes: {
                name: 'Preconfigured Default',
                host_urls: [],
                is_default: true,
                is_preconfigured: true,
              },
            },
          ],
        } as any;
      }
      return { saved_objects: [] } as any;
    });

    // First call: this.get('preconfigured-default') inside the internal update().
    // Second call: post-create re-fetch of the newly created host.
    esoClientMock.getDecryptedAsInternalUser
      .mockResolvedValueOnce({
        id: 'preconfigured-default',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {
          name: 'Preconfigured Default',
          host_urls: [],
          is_default: true,
          is_preconfigured: true,
          allow_edit: [],
        },
      } as any)
      .mockResolvedValueOnce({
        id: 'new-host',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {
          name: 'New Default',
          host_urls: ['https://fleet.example.com:8220'],
          is_default: true,
          is_preconfigured: false,
        },
      } as any);

    soClientMock.update.mockResolvedValue({ id: 'preconfigured-default', attributes: {} } as any);

    // Creating a host via the API (fromPreconfiguration is undefined) must not be rejected
    // by the preconfiguration guard when unsetting is_default on the preconfigured host.
    await expect(
      fleetServerHostService.create(
        soClientMock,
        esClientMock,
        {
          name: 'New Default',
          host_urls: ['https://fleet.example.com:8220'],
          is_default: true,
          is_preconfigured: false,
        },
        { id: 'new-host' }
      )
    ).resolves.toBeDefined();

    // The preconfigured host was undefaulted even though it was not edited from preconfiguration.
    expect(soClientMock.update).toHaveBeenCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'preconfigured-default',
      expect.objectContaining({ is_default: false })
    );
  });
});

describe('delete fleetServerHost', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should removeFleetServerHostFromAll agent policies without force if not deleted from preconfiguration', async () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();
    const soClientMock = getMockedSoClient();
    const esoClientMock = getMockedEncryptedSoClient();

    await fleetServerHostService.delete(esClientMock, 'test1', {});

    expect(esoClientMock.getDecryptedAsInternalUser).toBeCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'test1'
    );
    expect(jest.mocked(agentPolicyService.removeFleetServerHostFromAll)).toBeCalledWith(
      esClientMock,
      'test1',
      {
        force: undefined,
      }
    );
    expect(soClientMock.delete).toBeCalledWith(FLEET_SERVER_HOST_SAVED_OBJECT_TYPE, 'test1');
  });

  it('should removeFleetServerHostFromAll agent policies with force if deleted from preconfiguration', async () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();
    const soClientMock = getMockedSoClient();
    const esoClientMock = getMockedEncryptedSoClient();

    await (fleetServerHostService.delete as jest.Mock)(esClientMock, 'test1', {
      fromPreconfiguration: true,
    });

    expect(esoClientMock.getDecryptedAsInternalUser).toBeCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'test1'
    );
    expect(jest.mocked(agentPolicyService.removeFleetServerHostFromAll)).toBeCalledWith(
      esClientMock,
      'test1',
      {
        force: true,
      }
    );
    expect(soClientMock.delete).toBeCalledWith(FLEET_SERVER_HOST_SAVED_OBJECT_TYPE, 'test1');
  });
});

describe('bulkGet', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should decrypt and return multiple fleet server hosts', async () => {
    const esoClient = getMockedEncryptedSoClient();

    esoClient.getDecryptedAsInternalUser
      .mockResolvedValueOnce({
        id: 'host-1',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        attributes: { name: 'Host 1', host_urls: [], is_default: false },
        references: [],
      } as any)
      .mockResolvedValueOnce({
        id: 'host-2',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        attributes: { name: 'Host 2', host_urls: [], is_default: false },
        references: [],
      } as any);

    const hosts = await fleetServerHostService.bulkGet(['host-1', 'host-2']);

    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'host-1'
    );
    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'host-2'
    );
    expect(hosts).toHaveLength(2);
    expect(hosts[0].id).toEqual('host-1');
    expect(hosts[1].id).toEqual('host-2');
  });

  it('should filter out not found errors when ignoreNotFound is true', async () => {
    const esoClient = getMockedEncryptedSoClient();

    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'host-2'
    );

    esoClient.getDecryptedAsInternalUser
      .mockResolvedValueOnce({
        id: 'host-1',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        attributes: { name: 'Host 1', host_urls: [], is_default: false },
        references: [],
      } as any)
      .mockRejectedValueOnce(notFoundError);

    const hosts = await fleetServerHostService.bulkGet(['host-1', 'host-2'], {
      ignoreNotFound: true,
    });

    expect(hosts).toHaveLength(1);
    expect(hosts[0].id).toEqual('host-1');
  });

  it('should throw error for not found when ignoreNotFound is false', async () => {
    const esoClient = getMockedEncryptedSoClient();

    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'host-1'
    );

    esoClient.getDecryptedAsInternalUser.mockRejectedValue(notFoundError);

    await expect(
      fleetServerHostService.bulkGet(['host-1'], { ignoreNotFound: false } as any)
    ).rejects.toThrow();
  });

  it('should handle decryption errors when ignoreNotFound is true', async () => {
    const esoClient = getMockedEncryptedSoClient();

    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'host-1'
    );
    esoClient.getDecryptedAsInternalUser.mockRejectedValue(notFoundError);

    const hosts = await fleetServerHostService.bulkGet(['host-1'], {
      ignoreNotFound: true,
    });

    expect(hosts).toHaveLength(0);
  });

  it('should throw decryption errors when ignoreNotFound is false', async () => {
    const esoClient = getMockedEncryptedSoClient();

    const decryptionError = new Error('Decryption failed');
    esoClient.getDecryptedAsInternalUser.mockRejectedValue(decryptionError);

    await expect(
      fleetServerHostService.bulkGet(['host-1'], { ignoreNotFound: false } as any)
    ).rejects.toThrow('Decryption failed');
  });

  it('should return empty array when ids is empty', async () => {
    const esoClient = getMockedEncryptedSoClient();

    const hosts = await fleetServerHostService.bulkGet([]);

    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    expect(hosts).toEqual([]);
  });
});

describe('update', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

  function mockGetPreconfiguredHost(overrides: Record<string, unknown> = {}) {
    const esoClient = getMockedEncryptedSoClient();
    esoClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'private-fleet-server',
      type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'Private Fleet Server',
        host_urls: ['https://private.fleet.aws.elastic.cloud:443'],
        is_default: false,
        is_preconfigured: true,
        allow_edit: ['is_default'],
        ...overrides,
      },
    } as any);
    return esoClient;
  }

  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: true,
    } as any);
    (isSecretStorageEnabled as jest.Mock).mockResolvedValue(false);
  });

  it('should throw when updating a non-allow_edit field on a preconfigured host', async () => {
    const soClient = getMockedSoClient();
    mockGetPreconfiguredHost();

    await expect(
      fleetServerHostService.update(soClient, esClientMock, 'private-fleet-server', {
        host_urls: ['https://attacker.example.com:443'],
      })
    ).rejects.toThrow(
      'Preconfigured Fleet Server host private-fleet-server host_urls cannot be updated outside of the Kibana config file.'
    );
  });

  it('should throw when updating allow_edit itself on a preconfigured host', async () => {
    const soClient = getMockedSoClient();
    mockGetPreconfiguredHost();

    await expect(
      fleetServerHostService.update(soClient, esClientMock, 'private-fleet-server', {
        allow_edit: ['host_urls', 'is_default'],
      } as any)
    ).rejects.toThrow(
      'Preconfigured Fleet Server host private-fleet-server allow_edit cannot be updated outside of the Kibana config file.'
    );
  });

  it('should not throw FleetServerHostUnauthorizedError when updating an allow_edit field', async () => {
    const soClient = getMockedSoClient({ findHosts: true });
    mockGetPreconfiguredHost({ is_default: false });
    soClient.update.mockResolvedValue({ id: 'private-fleet-server', attributes: {} } as any);
    (agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts as jest.Mock).mockResolvedValue(
      undefined
    );

    const result = fleetServerHostService.update(soClient, esClientMock, 'private-fleet-server', {
      is_default: true,
    });

    // Should resolve (not throw the preconfigured field auth error)
    await expect(result).resolves.toBeDefined();
  });

  it('should undefault an existing preconfigured default host when setting a new default via API', async () => {
    const soClient = getMockedSoClient();
    const esoClient = getMockedEncryptedSoClient();

    // The host being updated is a regular (non-preconfigured) host; the current default is a
    // preconfigured host that does not allow editing is_default.
    esoClient.getDecryptedAsInternalUser.mockImplementation(async (type: string, id: string) => {
      if (id === 'private-fleet-server') {
        return {
          id: 'private-fleet-server',
          type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            name: 'Private Fleet Server',
            host_urls: ['https://private.fleet.aws.elastic.cloud:443'],
            is_default: true,
            is_preconfigured: true,
            allow_edit: [],
          },
        } as any;
      }
      return {
        id: 'regular-host',
        type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {
          name: 'Regular Host',
          host_urls: ['https://fleet.example.com:8220'],
          is_default: false,
          is_preconfigured: false,
        },
      } as any;
    });

    // getDefaultFleetServerHost() resolves to the preconfigured default host.
    soClient.find.mockImplementation(async ({ type }: any) => {
      if (type === FLEET_SERVER_HOST_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [
            {
              id: 'private-fleet-server',
              attributes: {
                name: 'Private Fleet Server',
                host_urls: [],
                is_default: true,
                is_preconfigured: true,
              },
            },
          ],
        } as any;
      }
      return { saved_objects: [] } as any;
    });

    soClient.update.mockResolvedValue({ id: 'regular-host', attributes: {} } as any);

    // Setting a new default via an API call (fromPreconfiguration is undefined) must not be
    // rejected by the preconfiguration guard when unsetting is_default on the preconfigured host.
    await expect(
      fleetServerHostService.update(soClient, esClientMock, 'regular-host', { is_default: true })
    ).resolves.toBeDefined();

    // The preconfigured host was undefaulted even though it was not edited from preconfiguration.
    expect(soClient.update).toHaveBeenCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'private-fleet-server',
      expect.objectContaining({ is_default: false })
    );
  });

  it('should not call extractAndUpdateFleetServerHostsSecrets or deleteSecrets when updating a non-secret field on a host with stored secrets', async () => {
    const soClient = getMockedSoClient();
    const esoClient = getMockedEncryptedSoClient();

    esoClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'fleet-server-with-secrets',
      type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'Fleet Server With Secrets',
        host_urls: ['https://fleet.example.com:8220'],
        is_default: false,
        is_preconfigured: false,
        secrets: { ssl: { key: { id: 'stored-secret-id' } } },
      },
    } as any);

    soClient.update.mockResolvedValue({ id: 'fleet-server-with-secrets', attributes: {} } as any);
    (isSecretStorageEnabled as jest.Mock).mockResolvedValue(true);

    await fleetServerHostService.update(soClient, esClientMock, 'fleet-server-with-secrets', {
      ssl: { certificate_authorities: ['/etc/certs/ca.pem'] },
    });

    expect(extractAndUpdateFleetServerHostsSecrets).not.toHaveBeenCalled();
    expect(deleteSecrets).not.toHaveBeenCalled();
    expect(soClient.update).toHaveBeenCalledWith(
      FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
      'fleet-server-with-secrets',
      expect.not.objectContaining({ secrets: expect.anything() })
    );
  });
});
