/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsUnit } from '@kbn/streams-schema';
import { StreamsUnitService } from './streams_unit_service';
import type { PublishUnitConfig } from '../unit_config/types';

const unit: StreamsUnit.Configuration = {
  sources: [
    {
      id: 'otlp-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'es-prod',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
};

const secrets: StreamsUnit.Secrets = { es_api_key: 's3cret' };

const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
  'streams-configuration',
  'default'
);

const storedConfiguration = {
  id: 'default',
  attributes: { unit_id: 'default', unit, secrets },
  references: [
    {
      name: 'streamsMetadata',
      type: 'streams-ui-metadata',
      id: 'default-streams-ui-metadata',
    },
  ],
};

const createService = ({
  soClient,
  publishUnit,
  encryptedSavedObjectsClient,
  canEncrypt = true,
}: {
  soClient: Pick<SavedObjectsClientContract, 'get' | 'create' | 'delete' | 'getCurrentNamespace'>;
  publishUnit?: PublishUnitConfig;
  encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  canEncrypt?: boolean;
}) => {
  return new StreamsUnitService({
    soClient: soClient as SavedObjectsClientContract,
    logger: loggerMock.create(),
    publishUnit,
    encryptedSavedObjectsClient,
    canEncrypt,
  });
};

const createSoClient = (
  overrides: Partial<
    Pick<SavedObjectsClientContract, 'get' | 'create' | 'delete' | 'getCurrentNamespace'>
  > = {}
) => ({
  get: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getCurrentNamespace: jest.fn().mockReturnValue('default'),
  ...overrides,
});

describe('StreamsUnitService', () => {
  it('returns stored unit configuration and UI metadata without secrets', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockImplementation(async (type: string) => {
        if (type === 'streams-configuration') {
          return storedConfiguration;
        }
        return {
          attributes: { metadata: { nodes: { 'otlp-input': { x: 1, y: 2 } } } },
        };
      }),
    });
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn(),
    } as unknown as EncryptedSavedObjectsClient;

    const service = createService({ soClient, encryptedSavedObjectsClient });
    const response = await service.getUnit('default');

    expect(response).toEqual({
      unit,
      ui_metadata: { nodes: { 'otlp-input': { x: 1, y: 2 } } },
    });
    expect(response).not.toHaveProperty('secrets');
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    expect(soClient.get).toHaveBeenCalledWith('streams-configuration', 'default');
    expect(soClient.get).toHaveBeenCalledWith('streams-ui-metadata', 'default-streams-ui-metadata');
  });

  it('throws 404 when the unit does not exist', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(notFoundError),
    });

    const service = createService({ soClient });

    await expect(service.getUnit('default')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('writes the configuration saved object with secrets, publishes, then writes UI metadata', async () => {
    const order: string[] = [];
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(notFoundError),
      create: jest.fn().mockImplementation(async (type: string) => {
        order.push(`create:${type}`);
      }),
    });
    const publishUnit = jest.fn().mockImplementation(async () => {
      order.push('publish');
    });

    const service = createService({ soClient, publishUnit });

    await service.upsertUnit({
      unitId: 'default',
      unit,
      ui_metadata: {
        nodes: {
          'otlp-input': { x: 0, y: 0 },
          stale: { x: 1, y: 1 },
        },
      },
      secrets,
    });

    expect(order).toEqual([
      'create:streams-configuration',
      'publish',
      'create:streams-ui-metadata',
    ]);
    expect(soClient.create).toHaveBeenNthCalledWith(
      1,
      'streams-configuration',
      { unit_id: 'default', unit, secrets },
      {
        id: 'default',
        overwrite: true,
        references: [
          {
            name: 'streamsMetadata',
            type: 'streams-ui-metadata',
            id: 'default-streams-ui-metadata',
          },
        ],
      }
    );
    expect(publishUnit).toHaveBeenCalledWith({ unitId: 'default', unit, secrets });
    expect(soClient.create).toHaveBeenNthCalledWith(
      2,
      'streams-ui-metadata',
      {
        metadata: {
          nodes: {
            'otlp-input': { x: 0, y: 0 },
          },
        },
      },
      {
        id: 'default-streams-ui-metadata',
        overwrite: true,
      }
    );
  });

  it('keeps stored secrets when the PUT omits them', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(new Error('should decrypt rather than use stripped get')),
      create: jest.fn().mockResolvedValue({}),
    });
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(storedConfiguration),
    } as unknown as EncryptedSavedObjectsClient;
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

    await service.upsertUnit({
      unitId: 'default',
      unit,
      ui_metadata: {},
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'streams-configuration',
      { unit_id: 'default', unit, secrets },
      expect.anything()
    );
    expect(publishUnit).toHaveBeenCalledWith({ unitId: 'default', unit, secrets });
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'streams-configuration',
      'default',
      { namespace: 'default' }
    );
  });

  it('overlays newly sent secrets onto the stored bag', async () => {
    const soClient = createSoClient({
      create: jest.fn().mockResolvedValue({}),
    });
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(storedConfiguration),
    } as unknown as EncryptedSavedObjectsClient;
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

    await service.upsertUnit({
      unitId: 'default',
      unit,
      ui_metadata: {},
      secrets: { s3_secret: 'bucket' },
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'streams-configuration',
      { unit_id: 'default', unit, secrets: { es_api_key: 's3cret', s3_secret: 'bucket' } },
      expect.anything()
    );
  });

  it('rejects upsert when encrypted saved objects cannot encrypt', async () => {
    const soClient = createSoClient();
    const service = createService({ soClient, canEncrypt: false });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
        secrets,
      })
    ).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('rolls back a newly created configuration when publish fails', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(notFoundError),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    });
    const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
      })
    ).rejects.toThrow('distributor down');

    expect(soClient.delete).toHaveBeenCalledWith('streams-configuration', 'default');
    expect(soClient.create).toHaveBeenCalledTimes(1);
  });

  it('still throws the publish error when rollback fails', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(notFoundError),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockRejectedValue(new Error('saved object delete failed')),
    });
    const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
      })
    ).rejects.toThrow('distributor down');
  });

  it('restores the previous decrypted configuration when publish fails on update', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockResolvedValue(storedConfiguration),
      create: jest.fn().mockResolvedValue({}),
    });
    const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
        secrets: { es_api_key: 'new-secret' },
      })
    ).rejects.toThrow('distributor down');

    expect(soClient.delete).not.toHaveBeenCalled();
    expect(soClient.create).toHaveBeenLastCalledWith(
      'streams-configuration',
      storedConfiguration.attributes,
      {
        id: 'default',
        overwrite: true,
        references: storedConfiguration.references,
      }
    );
  });

  it('deletes the configuration and UI metadata saved objects', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockResolvedValue(storedConfiguration),
      delete: jest.fn().mockResolvedValue({}),
    });

    const service = createService({ soClient });
    await service.resetUnit('default');

    expect(soClient.delete).toHaveBeenNthCalledWith(
      1,
      'streams-ui-metadata',
      'default-streams-ui-metadata'
    );
    expect(soClient.delete).toHaveBeenNthCalledWith(2, 'streams-configuration', 'default');
  });

  it('does nothing when the unit is not stored', async () => {
    const soClient = createSoClient({
      get: jest.fn().mockRejectedValue(notFoundError),
    });

    const service = createService({ soClient });
    await service.resetUnit('default');

    expect(soClient.delete).not.toHaveBeenCalled();
  });
});
