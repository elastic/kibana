/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../app_context';
import { fleetServerHostService } from '../fleet_server_host';

import type { FleetServerHost } from '../../../common/types';

import {
  createCloudFleetServerHostIfNeeded,
  getCloudFleetServersHosts,
  getPreconfiguredFleetServerHostFromConfig,
  createOrUpdatePreconfiguredFleetServerHosts,
} from './fleet_server_host';
import { hashSecret } from './outputs';

jest.mock('../fleet_server_host');
jest.mock('../app_context');
jest.mock('../agent_policy');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedFleetServerHostService = fleetServerHostService as jest.Mocked<
  typeof fleetServerHostService
>;

describe('getPreconfiguredFleetServerHostFromConfig', () => {
  it('should work with preconfigured fleetServerHosts', () => {
    const config = {
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: true,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual(config.fleetServerHosts);
  });

  it('should work with preconfigured fleetServerHosts that have SSL options', () => {
    const config = {
      fleetServerHosts: [
        {
          id: 'id1',
          name: 'fleet server 1',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
          ssl: {
            certificate_authorities: ['cert authorities'],
            es_certificate_authorities: ['es cert authorities'],
            certificate: 'path/to/cert',
            es_certificate: 'path/to/EScert',
          },
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual(config.fleetServerHosts);
  });

  it('should work with agents.fleet_server.hosts', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual([
      {
        id: 'fleet-default-fleet-server-host',
        name: 'Default',
        host_urls: ['http://test.fr'],
        is_default: true,
      },
    ]);
  });

  it('should work with agents.fleet_server.hosts and preconfigured outputs', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: false,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toHaveLength(2);
    expect(res.map(({ id }) => id)).toEqual(['fleet-123', 'fleet-default-fleet-server-host']);
  });

  it('should work with preconfigured internal fleetServerHosts', () => {
    const config = {
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: true,
          host_urls: ['http://test.fr'],
        },
        {
          id: 'fleet-internal',
          name: 'TEST_INTERNAL',
          is_default: false,
          is_internal: true,
          host_urls: ['http://test-internal.fr'],
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual(config.fleetServerHosts);
  });

  it('should throw if there is multiple default outputs', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: true,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    expect(() => getPreconfiguredFleetServerHostFromConfig(config)).toThrowError(
      /Only one default Fleet Server host is allowed/
    );
  });
});

describe('getCloudFleetServersHosts', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
  });
  it('should return undefined if cloud is not setup', () => {
    expect(getCloudFleetServersHosts()).toBeUndefined();
  });

  it('should return fleet server hosts if cloud is correctly setup in serverless', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      cloudHost: 'us-east-1.aws.found.io',
      apm: {},
      onboarding: {},
      isServerlessEnabled: true,
      serverless: {
        projectId: undefined,
      },
    });

    expect(getCloudFleetServersHosts()).toBeUndefined();
  });

  it('should return fleet server hosts if cloud is correctly setup with default port == 443', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      cloudHost: 'us-east-1.aws.found.io',
      apm: {},
      onboarding: {},
      isServerlessEnabled: false,
      serverless: {
        projectId: undefined,
      },
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.us-east-1.aws.found.io",
      ]
    `);
  });

  it('should return fleet server hosts if cloud is correctly setup with a default port', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'test:dGVzdC5mcjo5MjQzJGRhM2I2YjNkYWY5ZDRjODE4ZjI4ZmEzNDdjMzgzODViJDgxMmY4NWMxZjNjZTQ2YTliYjgxZjFjMWIxMzRjNmRl',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      cloudHost: 'test.fr',
      cloudDefaultPort: '9243',
      apm: {},
      onboarding: {},
      isServerlessEnabled: false,
      serverless: {
        projectId: undefined,
      },
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.test.fr:9243",
      ]
    `);
  });
});

describe('createCloudFleetServerHostIfNeeded', () => {
  afterEach(() => {
    mockedFleetServerHostService.create.mockReset();
    mockedAppContextService.getCloud.mockReset();
  });
  it('should do nothing if there is no cloud fleet server hosts', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createCloudFleetServerHostIfNeeded(soClient, esClient);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
  });

  it('should do nothing if there is already an host configured', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
      onboarding: {},
      isServerlessEnabled: false,
      serverless: {
        projectId: undefined,
      },
    });
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'test',
    } as any);

    await createCloudFleetServerHostIfNeeded(soClient, esClient);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
  });

  it('should create a new fleet server hosts if there is no host configured', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      cloudHost: 'us-east-1.aws.found.io',
      apm: {},
      onboarding: {},
      isServerlessEnabled: false,
      serverless: {
        projectId: undefined,
      },
    });
    mockedFleetServerHostService.get.mockResolvedValue(null as any);
    soClient.create.mockResolvedValue({
      id: 'test-id',
      attributes: {},
    } as any);

    await createCloudFleetServerHostIfNeeded(soClient, esClient);

    expect(mockedFleetServerHostService.create).toBeCalledTimes(1);
    expect(mockedFleetServerHostService.create).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        host_urls: ['https://deployment-id-1.fleet.us-east-1.aws.found.io'],
        is_default: true,
      }),
      { id: 'fleet-default-fleet-server-host', overwrite: true, fromPreconfiguration: true }
    );
  });
});

describe('createOrUpdatePreconfiguredFleetServerHosts', () => {
  let secretHash: string;
  beforeEach(async () => {
    secretHash = await hashSecret('secretKey');
    mockedFleetServerHostService.bulkGet.mockResolvedValue([
      {
        id: 'fleet-123',
        name: 'TEST',
        is_default: true,
        host_urls: ['http://test.fr'],
      },
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
      },
      {
        id: 'fleet-with-secrets',
        name: 'TEST_SECRETS',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        secrets: {
          ssl: {
            key: { id: 'test123', hash: secretHash },
          },
        },
      },
    ] as FleetServerHost[]);
  });
  afterEach(() => {
    mockedFleetServerHostService.bulkGet.mockReset();
    jest.resetAllMocks();
  });

  it('should create a preconfigured fleet server host that does not exist', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'new-fleet-server-host',
        name: 'TEST_1',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
      },
    ]);
    expect(mockedFleetServerHostService.create).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        name: 'TEST_1',
      }),
      expect.anything()
    );
    expect(mockedFleetServerHostService.update).not.toBeCalled();
  });

  it('should create a preconfigured fleet server host with secrets that does not exist', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'new-fleet-server-host',
        name: 'TEST_1',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        secrets: {
          ssl: {
            key: 'unsecureKey1',
            es_key: 'unsecureKey2',
          },
        },
      },
    ]);
    expect(mockedFleetServerHostService.create).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        name: 'TEST_1',
        secrets: {
          ssl: {
            key: 'unsecureKey1',
            es_key: 'unsecureKey2',
          },
        },
      }),
      expect.anything()
    );
    expect(mockedFleetServerHostService.update).not.toBeCalled();
  });

  it('should update preconfigured fleet server hosts if is_internal flag changes', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: true,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-internal',
      expect.objectContaining({
        is_internal: true,
      }),
      { fromPreconfiguration: true, secretHashes: {} }
    );
  });

  it('should update preconfigured fleet server hosts if host_urls change', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr', 'http://test.fr'],
        is_preconfigured: true,
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-internal',
      expect.objectContaining({
        host_urls: ['http://test-internal.fr', 'http://test.fr'],
      }),
      { fromPreconfiguration: true, secretHashes: {} }
    );
  });

  it('should update preconfigured fleet server hosts if proxy_id change', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        proxy_id: 'proxy-test',
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-internal',
      expect.objectContaining({
        proxy_id: 'proxy-test',
      }),
      { fromPreconfiguration: true, secretHashes: {} }
    );
  });

  it('should update preconfigured fleet server hosts if preconfigured host exists and changed to have ssl', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        ssl: {
          key: 'unsecureKey1',
          es_key: 'unsecureKey2',
        },
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-internal',
      expect.objectContaining({
        ssl: {
          key: 'unsecureKey1',
          es_key: 'unsecureKey2',
        },
      }),
      expect.anything()
    );
  });

  it('should update preconfigured fleet server hosts if preconfigured host exists and changed to have secrets', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        secrets: {
          ssl: {
            key: 'unsecureKey1',
            es_key: 'unsecureKey2',
          },
        },
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-internal',
      expect.objectContaining({
        secrets: {
          ssl: {
            key: 'unsecureKey1',
            es_key: 'unsecureKey2',
          },
        },
      }),
      expect.anything()
    );
  });
  it('should update preconfigured fleet server hosts if preconfigured host with secrets exists and changes', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-with-secrets',
        name: 'TEST_SECRETS',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        secrets: {
          ssl: {
            key: 'secretKey',
            es_key: 'secretKey2',
          },
        },
      },
    ]);

    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      'fleet-with-secrets',
      expect.objectContaining({
        secrets: {
          ssl: {
            key: 'secretKey',
            es_key: 'secretKey2',
          },
        },
      }),
      expect.anything()
    );
  });

  it('should not update preconfigured fleet server hosts if no fields changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-internal',
        name: 'TEST_INTERNAL',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
      },
    ]);
    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).not.toBeCalled();
  });

  it('should not update preconfigured fleet server hosts with secrets if no fields changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await createOrUpdatePreconfiguredFleetServerHosts(soClient, esClient, [
      {
        id: 'fleet-with-secrets',
        name: 'TEST_SECRETS',
        is_default: false,
        is_internal: false,
        host_urls: ['http://test-internal.fr'],
        is_preconfigured: true,
        secrets: {
          ssl: {
            key: 'secretKey',
          },
        },
      },
    ]);
    expect(mockedFleetServerHostService.create).not.toBeCalled();
    expect(mockedFleetServerHostService.update).not.toBeCalled();
  });
});
