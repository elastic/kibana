/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsUnit } from '@kbn/streams-schema';
import { StreamsUnitService } from './streams_unit_service';
import type { PublishUnitConfig } from '../unit_config/types';
import type {
  StreamsConfigurationSavedObjectAttributes,
  StreamsUiMetadataSavedObjectAttributes,
} from './streams_configuration';

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
  pipelines: [
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-prod'] },
      ],
    },
  ],
};

const secrets: StreamsUnit.Secrets = { es_api_key: 's3cret' };

const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
  'streams-configuration',
  'default'
);

const asSavedObject = <T>(
  type: string,
  attributes: T,
  { id = 'default', references = [] }: { id?: string; references?: SavedObject['references'] } = {}
): SavedObject<T> => ({
  id,
  type,
  attributes,
  references,
});

const storedConfiguration = asSavedObject<StreamsConfigurationSavedObjectAttributes>(
  'streams-configuration',
  { unit_id: 'default', unit, secrets },
  {
    references: [
      {
        name: 'streamsMetadata',
        type: 'streams-ui-metadata',
        id: 'default-streams-ui-metadata',
      },
    ],
  }
);

const createService = ({
  soClient,
  publishUnit,
  encryptedSavedObjectsClient,
  canEncrypt = true,
}: {
  soClient: ReturnType<typeof savedObjectsClientMock.create>;
  publishUnit?: PublishUnitConfig;
  encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  canEncrypt?: boolean;
}) => {
  return new StreamsUnitService({
    soClient,
    logger: loggerMock.create(),
    publishUnit,
    encryptedSavedObjectsClient,
    canEncrypt,
  });
};

const createSoClient = () => {
  const soClient = savedObjectsClientMock.create();
  soClient.getCurrentNamespace.mockReturnValue('default');
  return soClient;
};

describe('StreamsUnitService', () => {
  it('returns stored unit configuration and UI metadata without secrets', async () => {
    const soClient = createSoClient();
    soClient.get.mockImplementation(async (type: string) => {
      if (type === 'streams-configuration') {
        return storedConfiguration;
      }
      return asSavedObject<StreamsUiMetadataSavedObjectAttributes>(
        'streams-ui-metadata',
        { metadata: { nodes: { 'otlp-input': { x: 1, y: 2 } } } },
        { id: 'default-streams-ui-metadata' }
      );
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
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);

    const service = createService({ soClient });

    await expect(service.getUnit('default')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('writes the configuration saved object with secrets, publishes, then writes UI metadata', async () => {
    const order: string[] = [];
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockImplementation(async (type: string, attributes) => {
      order.push(`create:${type}`);
      return asSavedObject(type, attributes);
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
        initialNamespaces: ['*'],
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
        initialNamespaces: ['*'],
      }
    );
  });

  it('keeps stored secrets when the PUT omits them', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(new Error('should decrypt rather than use stripped get'));
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
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
    const soClient = createSoClient();
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
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
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    soClient.delete.mockResolvedValue({});
    const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
      })
    ).rejects.toThrow('distributor down');

    expect(soClient.delete).toHaveBeenCalledWith('streams-configuration', 'default', {
      force: true,
    });
    expect(soClient.create).toHaveBeenCalledTimes(1);
  });

  it('still throws the publish error when rollback fails', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    soClient.delete.mockRejectedValue(new Error('saved object delete failed'));
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
    const soClient = createSoClient();
    soClient.get.mockResolvedValue(storedConfiguration);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
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
        initialNamespaces: ['*'],
        references: storedConfiguration.references,
      }
    );
  });

  it('keeps stored UI metadata on a YAML-style PUT that omits it, pruning stale nodes', async () => {
    const unitWithFileDrop: StreamsUnit.Configuration = {
      ...unit,
      sources: [
        ...unit.sources,
        {
          id: 'file-drop',
          type: 'file',
          supported_telemetry: ['logs'],
        },
      ],
    };
    let storedMetadata: StreamsUnit.UiMetadata | undefined;
    let hasConfiguration = false;
    const soClient = createSoClient();
    soClient.get.mockImplementation(async (type: string) => {
      if (type === 'streams-configuration') {
        if (!hasConfiguration) {
          throw notFoundError;
        }
        return storedConfiguration;
      }
      if (storedMetadata === undefined) {
        throw notFoundError;
      }
      return asSavedObject<StreamsUiMetadataSavedObjectAttributes>(
        'streams-ui-metadata',
        { metadata: storedMetadata },
        { id: 'default-streams-ui-metadata' }
      );
    });
    soClient.create.mockImplementation(async (type: string, attributes) => {
      if (type === 'streams-configuration') {
        hasConfiguration = true;
      }
      if (type === 'streams-ui-metadata') {
        storedMetadata = (attributes as StreamsUiMetadataSavedObjectAttributes).metadata;
      }
      return asSavedObject(type, attributes);
    });

    const service = createService({ soClient });

    await service.upsertUnit({
      unitId: 'default',
      unit: unitWithFileDrop,
      ui_metadata: {
        nodes: {
          'otlp-input': { x: 1, y: 2 },
          'file-drop': { x: 3, y: 4 },
          stale: { x: 9, y: 9 },
        },
      },
    });

    await service.upsertUnit({
      unitId: 'default',
      unit,
    });

    const uiMetadataWrites = soClient.create.mock.calls.filter(
      ([type]) => type === 'streams-ui-metadata'
    );

    expect(uiMetadataWrites).toHaveLength(2);
    expect(uiMetadataWrites[0][1]).toEqual({
      metadata: {
        nodes: {
          'otlp-input': { x: 1, y: 2 },
          'file-drop': { x: 3, y: 4 },
        },
      },
    });
    expect(uiMetadataWrites[1][1]).toEqual({
      metadata: {
        nodes: {
          'otlp-input': { x: 1, y: 2 },
        },
      },
    });
  });

  it('deletes the configuration and UI metadata saved objects', async () => {
    const soClient = createSoClient();
    soClient.get.mockResolvedValue(storedConfiguration);
    soClient.delete.mockResolvedValue({});

    const service = createService({ soClient });
    await service.resetUnit('default');

    expect(soClient.delete).toHaveBeenNthCalledWith(
      1,
      'streams-ui-metadata',
      'default-streams-ui-metadata',
      { force: true }
    );
    expect(soClient.delete).toHaveBeenNthCalledWith(2, 'streams-configuration', 'default', {
      force: true,
    });
  });

  it('does nothing when the unit is not stored', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);

    const service = createService({ soClient });
    await service.resetUnit('default');

    expect(soClient.delete).not.toHaveBeenCalled();
  });
});
