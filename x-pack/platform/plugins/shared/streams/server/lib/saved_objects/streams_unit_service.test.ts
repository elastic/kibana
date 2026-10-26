/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  EncryptionError,
  EncryptionErrorOperation,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import { StreamsUnitService } from './streams_unit_service';
import { createConfigDistributorClient } from '../unit_config/config_distributor_client';
import { createEncryptionKeyStore } from '../unit_config/encryption_key_store';
import { createCredentialPreparer } from '../unit_config/seal_credentials';
import type {
  PrepareUnitCredentials,
  PublishUnitConfig,
  StoredUnitCredential,
  UnitCredential,
  ValidateUnitConfig,
} from '../unit_config/types';
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
      config: [{ name: 'api_key', value: { credential: 'es-prod' } }],
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

const secrets: StreamsUnit.Secrets = { 'es-prod': 's3cret' };

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

// Stand-in sealer: one `sealed:<name>` credential per secret, sorted by name.
const storedFor = (names: string[]): StoredUnitCredential[] =>
  [...names].sort().map((name) => ({ name, target: 'dev', ciphertext: `sealed:${name}` }));

const sealedFor = (names: string[]): UnitCredential[] =>
  storedFor(names).map(({ name, ciphertext }) => ({ name, ciphertext }));

const fakePrepareCredentials = (): jest.MockedFunction<PrepareUnitCredentials> =>
  jest.fn(async ({ secrets: toSeal }) => ({
    credentials: sealedFor(Object.keys(toSeal)),
    sealed: storedFor(Object.keys(toSeal)),
  }));

const createService = ({
  soClient,
  publishUnit,
  validateUnit,
  prepareCredentials = fakePrepareCredentials(),
  encryptedSavedObjectsClient,
  canEncrypt = true,
  logger = loggerMock.create(),
}: {
  soClient: ReturnType<typeof savedObjectsClientMock.create>;
  publishUnit?: PublishUnitConfig;
  validateUnit?: ValidateUnitConfig;
  prepareCredentials?: PrepareUnitCredentials | null;
  encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  canEncrypt?: boolean;
  logger?: Logger;
}) => {
  return new StreamsUnitService({
    soClient,
    logger,
    publishUnit,
    validateUnit,
    prepareCredentials: prepareCredentials ?? undefined,
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

  it('throws when the unit does not exist', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);

    const service = createService({ soClient });

    await expect(service.getUnit('default')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Streams unit [default] not found.',
    });
  });

  it('returns an empty unit from getUnitOrEmpty when the unit does not exist', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);

    const service = createService({ soClient });

    await expect(service.getUnitOrEmpty('default')).resolves.toEqual({
      unit: { sources: [], destinations: [], pipelines: [] },
      ui_metadata: {},
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
      { unit_id: 'default', unit, secrets, sealed_credentials: storedFor(['es-prod']) },
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
    expect(publishUnit).toHaveBeenCalledWith({
      unitId: 'default',
      unit,
      credentials: sealedFor(['es-prod']),
    });
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

  it('runs onPublished after publishing, even when the UI metadata write then fails', async () => {
    const order: string[] = [];
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockImplementation(async (type: string, attributes) => {
      if (type === 'streams-ui-metadata') {
        throw new Error('metadata write failed');
      }
      return asSavedObject(type, attributes);
    });
    const publishUnit = jest.fn().mockImplementation(async () => {
      order.push('publish');
    });
    const onPublished = jest.fn().mockImplementation(async () => {
      order.push('onPublished');
    });

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets, onPublished })
    ).resolves.toEqual({ ui_metadata_not_persisted: true });
    expect(order).toEqual(['publish', 'onPublished']);
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
      { unit_id: 'default', unit, secrets, sealed_credentials: storedFor(['es-prod']) },
      expect.anything()
    );
    expect(publishUnit).toHaveBeenCalledWith({
      unitId: 'default',
      unit,
      credentials: sealedFor(['es-prod']),
    });
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
    const unitWithS3: StreamsUnit.Configuration = {
      ...unit,
      destinations: [
        ...unit.destinations,
        {
          id: 's3-archive',
          type: 's3',
          supported_telemetry: ['logs'],
          config: [{ name: 'secret_access_key', value: { credential: 's3-archive' } }],
        },
      ],
    };

    await service.upsertUnit({
      unitId: 'default',
      unit: unitWithS3,
      ui_metadata: {},
      secrets: { 's3-archive': 'bucket' },
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'streams-configuration',
      {
        unit_id: 'default',
        unit: unitWithS3,
        secrets: { 'es-prod': 's3cret', 's3-archive': 'bucket' },
        sealed_credentials: storedFor(['es-prod', 's3-archive']),
      },
      expect.anything()
    );
  });

  it('prunes a stored secret after the node that referenced it is deleted', async () => {
    const soClient = createSoClient();
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
        ...storedConfiguration,
        attributes: {
          ...storedConfiguration.attributes,
          secrets: { ...secrets, 'deleted-dest': 'stale' },
        },
      }),
    } as unknown as EncryptedSavedObjectsClient;
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

    await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {} });

    expect(soClient.create).toHaveBeenCalledWith(
      'streams-configuration',
      { unit_id: 'default', unit, secrets, sealed_credentials: storedFor(['es-prod']) },
      expect.anything()
    );
    expect(publishUnit).toHaveBeenCalledWith({
      unitId: 'default',
      unit,
      credentials: sealedFor(['es-prod']),
    });
  });

  it('rejects a request secret that no config value references with 400', async () => {
    const soClient = createSoClient();
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(storedConfiguration),
    } as unknown as EncryptedSavedObjectsClient;
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit,
        ui_metadata: {},
        secrets: { 'es-prod': 'new', unknown: 'typed-value' },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'Streams unit secrets must be referenced by a { credential: <name> } config value: unknown',
    });
    expect(soClient.create).not.toHaveBeenCalled();
    expect(publishUnit).not.toHaveBeenCalled();
  });

  const unitReferencing = (value: unknown): StreamsUnit.Configuration => ({
    ...unit,
    destinations: [{ ...unit.destinations[0], config: [{ name: 'api_key', value }] }],
  });

  it.each([
    ['a plain string config value', 'es-prod'],
    ['an object with extra keys', { credential: 'es-prod', extra: 1 }],
    ['a non-string credential', { credential: 1 }],
  ])('does not treat %s as a reference', async (_, value) => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit: unitReferencing(value),
        ui_metadata: {},
        secrets: { 'es-prod': 'x' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(soClient.create).not.toHaveBeenCalled();
    expect(publishUnit).not.toHaveBeenCalled();
  });

  it.each([
    ['a regular name', 'es-prod'],
    ['an Object.prototype name', 'constructor'],
  ])('rejects a reference to %s with no request or stored secret with 400', async (_, name) => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    const publishUnit = jest.fn().mockResolvedValue(undefined);

    const service = createService({ soClient, publishUnit });

    await expect(
      service.upsertUnit({
        unitId: 'default',
        unit: unitReferencing({ credential: name }),
        ui_metadata: {},
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: `Streams unit references credentials that have no secret: ${name}`,
    });
    expect(soClient.create).not.toHaveBeenCalled();
    expect(publishUnit).not.toHaveBeenCalled();
  });

  it('shares one secret between nodes that reference the same name', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    const publishUnit = jest.fn().mockResolvedValue(undefined);
    const sharedUnit: StreamsUnit.Configuration = {
      ...unit,
      destinations: ['es-a', 'es-b'].map((id) => ({
        id,
        type: 'debug',
        supported_telemetry: ['logs'],
        config: [{ name: 'api_key', value: { credential: 'es-shared' } }],
      })),
    };

    const service = createService({ soClient, publishUnit });

    await service.upsertUnit({
      unitId: 'default',
      unit: sharedUnit,
      ui_metadata: {},
      secrets: { 'es-shared': 'x' },
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'streams-configuration',
      {
        unit_id: 'default',
        unit: sharedUnit,
        secrets: { 'es-shared': 'x' },
        sealed_credentials: storedFor(['es-shared']),
      },
      expect.anything()
    );
    expect(publishUnit).toHaveBeenCalledWith({
      unitId: 'default',
      unit: sharedUnit,
      credentials: sealedFor(['es-shared']),
    });
  });

  it('drops all secrets from a unit without component lists', async () => {
    const soClient = createSoClient();
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(storedConfiguration),
    } as unknown as EncryptedSavedObjectsClient;
    const publishUnit = jest.fn().mockResolvedValue(undefined);
    const bareUnit = { pipelines: [] } as unknown as StreamsUnit.Configuration;

    const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

    await service.upsertUnit({ unitId: 'default', unit: bareUnit, ui_metadata: {} });

    expect(publishUnit).toHaveBeenCalledWith({
      unitId: 'default',
      unit: bareUnit,
      credentials: [],
    });
  });

  it('prepares once, then validates, writes, and publishes with the same credentials', async () => {
    const order: string[] = [];
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockImplementation(async (type: string, attributes) => {
      order.push(`create:${type}`);
      return asSavedObject(type, attributes);
    });
    const prepareCredentials = jest.fn(async () => {
      order.push('prepare');
      return { credentials: sealedFor(['es-prod']), sealed: storedFor(['es-prod']) };
    });
    const validateUnit = jest.fn(async () => {
      order.push('validate');
      return {};
    });
    const publishUnit = jest.fn(async () => {
      order.push('publish');
    });

    const service = createService({ soClient, publishUnit, validateUnit, prepareCredentials });

    await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });

    expect(order).toEqual([
      'prepare',
      'validate',
      'create:streams-configuration',
      'publish',
      'create:streams-ui-metadata',
    ]);
    expect(prepareCredentials).toHaveBeenCalledTimes(1);
    expect(prepareCredentials).toHaveBeenCalledWith({
      secrets,
      previous: { secrets: {}, sealed: [] },
    });
    const [[{ credentials: validated }]] = validateUnit.mock.calls as unknown as Array<
      [{ credentials: UnitCredential[] }]
    >;
    const [[{ credentials: published }]] = publishUnit.mock.calls as unknown as Array<
      [{ credentials: UnitCredential[] }]
    >;
    expect(validated).toBe(published);
  });

  it('writes nothing when validation fails', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    const validateUnit = jest.fn().mockRejectedValue(new StatusError('invalid unit', 400));
    const publishUnit = jest.fn();

    const service = createService({ soClient, publishUnit, validateUnit });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(soClient.create).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
    expect(publishUnit).not.toHaveBeenCalled();
  });

  it('seals, validates, writes and publishes nothing when the stored document fails to decrypt', async () => {
    const soClient = createSoClient();
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest
        .fn()
        .mockRejectedValue(
          new EncryptionError(
            'Unable to decrypt attribute "secrets"',
            'secrets',
            EncryptionErrorOperation.Decryption
          )
        ),
    } as unknown as EncryptedSavedObjectsClient;
    const prepareCredentials = fakePrepareCredentials();
    const validateUnit = jest.fn();
    const publishUnit = jest.fn();

    const service = createService({
      soClient,
      publishUnit,
      validateUnit,
      prepareCredentials,
      encryptedSavedObjectsClient,
    });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {} })
    ).rejects.toBeInstanceOf(EncryptionError);
    expect(prepareCredentials).not.toHaveBeenCalled();
    expect(validateUnit).not.toHaveBeenCalled();
    expect(soClient.create).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
    expect(publishUnit).not.toHaveBeenCalled();
  });

  it('rejects with 503 before validating when secrets exist and no preparer is configured', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    const validateUnit = jest.fn();

    const service = createService({ soClient, validateUnit, prepareCredentials: null });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(validateUnit).not.toHaveBeenCalled();
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('skips the preparer for a unit without secrets', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    const prepareCredentials = fakePrepareCredentials();
    const validateUnit = jest.fn().mockResolvedValue({});
    const unitWithoutSecrets = unitReferencing('plain');

    const service = createService({ soClient, validateUnit, prepareCredentials });

    await service.upsertUnit({ unitId: 'default', unit: unitWithoutSecrets, ui_metadata: {} });

    expect(prepareCredentials).not.toHaveBeenCalled();
    expect(validateUnit).toHaveBeenCalledWith({ unit: unitWithoutSecrets, credentials: [] });
  });

  it('rejects with 500 when the preparer does not return one credential per secret', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    const prepareCredentials = jest.fn().mockResolvedValue({ credentials: [], sealed: [] });

    const service = createService({ soClient, prepareCredentials });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets })
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('returns the validation result', async () => {
    const soClient = createSoClient();
    soClient.get.mockRejectedValue(notFoundError);
    soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
    const validateUnit = jest.fn().mockResolvedValue({ compiled_config: 'receivers: {}' });

    const service = createService({ soClient, validateUnit });

    await expect(
      service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets })
    ).resolves.toEqual({ compiled_config: 'receivers: {}' });
  });

  describe('sealed credential cache', () => {
    const storedWithCache = (
      sealedCredentials: StoredUnitCredential[],
      extraSecrets: StreamsUnit.Secrets = {}
    ) => ({
      ...storedConfiguration,
      attributes: {
        ...storedConfiguration.attributes,
        secrets: { ...secrets, ...extraSecrets },
        sealed_credentials: sealedCredentials,
      },
    });

    const decryptingClient = (stored: SavedObject<StreamsConfigurationSavedObjectAttributes>) =>
      ({
        getDecryptedAsInternalUser: jest.fn().mockResolvedValue(stored),
      } as unknown as EncryptedSavedObjectsClient);

    it('persists the prepared blobs next to the secrets', async () => {
      const soClient = createSoClient();
      soClient.get.mockRejectedValue(notFoundError);
      soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));

      const service = createService({ soClient });

      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });

      expect(soClient.create.mock.calls[0][1]).toEqual({
        unit_id: 'default',
        unit,
        secrets,
        sealed_credentials: storedFor(['es-prod']),
      });
    });

    it('passes stored secrets and blobs to the preparer', async () => {
      const soClient = createSoClient();
      soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
      const cache = storedFor(['es-prod']);
      const prepareCredentials = fakePrepareCredentials();

      const service = createService({
        soClient,
        prepareCredentials,
        encryptedSavedObjectsClient: decryptingClient(storedWithCache(cache)),
      });

      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {} });

      expect(prepareCredentials).toHaveBeenCalledWith({
        secrets,
        previous: { secrets, sealed: cache },
      });
    });

    it('treats a configuration without a cache as having no blobs', async () => {
      const soClient = createSoClient();
      soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
      const prepareCredentials = fakePrepareCredentials();

      const service = createService({
        soClient,
        prepareCredentials,
        encryptedSavedObjectsClient: decryptingClient(storedConfiguration),
      });

      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {} });

      expect(prepareCredentials).toHaveBeenCalledWith({
        secrets,
        previous: { secrets, sealed: [] },
      });
    });

    it('drops the blob with its pruned secret', async () => {
      const soClient = createSoClient();
      soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));

      const service = createService({
        soClient,
        encryptedSavedObjectsClient: decryptingClient(
          storedWithCache(storedFor(['es-prod', 's3-archive']), { 's3-archive': 'bucket' })
        ),
      });

      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {} });

      expect(soClient.create.mock.calls[0][1]).toMatchObject({
        secrets,
        sealed_credentials: storedFor(['es-prod']),
      });
    });

    it('restores the previous blobs when publish fails', async () => {
      const soClient = createSoClient();
      soClient.create.mockResolvedValue(asSavedObject('streams-configuration', {}));
      const stored = storedWithCache(storedFor(['es-prod']));
      const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decryptingClient(stored),
      });

      await expect(
        service.upsertUnit({
          unitId: 'default',
          unit,
          ui_metadata: {},
          secrets: { 'es-prod': 'new-secret' },
        })
      ).rejects.toThrow('distributor down');

      expect(soClient.create).toHaveBeenLastCalledWith(
        'streams-configuration',
        stored.attributes,
        expect.objectContaining({ id: 'default', overwrite: true })
      );
    });

    it('does not return the cache from GET', async () => {
      const soClient = createSoClient();
      soClient.get.mockImplementation(async (type: string) => {
        if (type === 'streams-configuration') {
          return storedWithCache(storedFor(['es-prod']));
        }
        throw notFoundError;
      });

      const service = createService({ soClient });

      const response = await service.getUnit('default');

      expect(Object.keys(response).sort()).toEqual(['ui_metadata', 'unit']);
      expect(JSON.stringify(response)).not.toContain('sealed');
    });
  });

  it('lists the ids of stored units across all spaces', async () => {
    const soClient = createSoClient();
    soClient.openPointInTimeForType.mockResolvedValue({ id: 'pit-1' });
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        { ...storedConfiguration, score: 0 },
        { ...storedConfiguration, id: 'unit-2', score: 0 },
      ],
      total: 2,
      per_page: 100,
      page: 1,
      pit_id: 'pit-1',
    });

    const service = createService({ soClient });

    await expect(service.listUnitIds()).resolves.toEqual(['default', 'unit-2']);
    expect(soClient.find.mock.calls[0][0]).toMatchObject({
      type: 'streams-configuration',
      namespaces: ['*'],
    });
    expect(soClient.closePointInTime.mock.calls[0][0]).toBe('pit-1');
  });

  describe('republishUnit', () => {
    const oldKidBlobs: StoredUnitCredential[] = [
      { name: 'es-prod', target: 'dev', ciphertext: 'sealed-under-old-kid' },
    ];

    const storedAt = (
      sealedCredentials?: StoredUnitCredential[],
      attributes: Partial<StreamsConfigurationSavedObjectAttributes> = {}
    ): SavedObject<StreamsConfigurationSavedObjectAttributes> => ({
      ...storedConfiguration,
      version: 'v1',
      attributes: {
        ...storedConfiguration.attributes,
        ...(sealedCredentials ? { sealed_credentials: sealedCredentials } : {}),
        ...attributes,
      },
    });

    const decrypting = (stored: SavedObject<StreamsConfigurationSavedObjectAttributes>) =>
      ({
        getDecryptedAsInternalUser: jest.fn().mockResolvedValue(stored),
      } as unknown as EncryptedSavedObjectsClient);

    // `get` is the version re-read before the PUT; `create` answers a write with version v2.
    const soClientAt = (currentVersion: string) => {
      const soClient = createSoClient();
      soClient.get.mockResolvedValue({ ...storedConfiguration, version: currentVersion });
      soClient.create.mockImplementation(async (type: string, attributes) => ({
        ...asSavedObject(type, attributes),
        version: 'v2',
      }));
      return soClient;
    };

    it('publishes the stored unit and blobs without validating or writing when nothing changed', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn();
      const validateUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        validateUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(storedFor(['es-prod']))),
      });

      await expect(service.republishUnit('default')).resolves.toBe('republished');

      expect(validateUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.delete).not.toHaveBeenCalled();
      expect(publishUnit).toHaveBeenCalledWith({
        unitId: 'default',
        unit,
        credentials: sealedFor(['es-prod']),
      });
    });

    it('does not re-seal when the stored blobs are in a different order', async () => {
      const soClient = soClientAt('v1');
      const validateUnit = jest.fn();
      const twoSecrets = { 'es-prod': 's3cret', 's3-key': 'k3y' };

      const service = createService({
        soClient,
        publishUnit: jest.fn(),
        validateUnit,
        encryptedSavedObjectsClient: decrypting(
          storedAt(storedFor(['es-prod', 's3-key']).reverse(), { secrets: twoSecrets })
        ),
      });

      await expect(service.republishUnit('default')).resolves.toBe('republished');

      expect(validateUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('passes the run signal to validate and publish', async () => {
      const { signal } = new AbortController();
      const validateUnit = jest.fn().mockResolvedValue({});
      const publishUnit = jest.fn();

      const service = createService({
        soClient: soClientAt('v2'),
        validateUnit,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default', signal)).resolves.toBe('resealed');

      expect(validateUnit).toHaveBeenCalledWith(expect.objectContaining({ signal }));
      expect(publishUnit).toHaveBeenCalledWith(expect.objectContaining({ signal }));
    });

    it('publishes a unit without secrets without calling the preparer', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn();
      const prepareCredentials = fakePrepareCredentials();

      const service = createService({
        soClient,
        publishUnit,
        prepareCredentials,
        encryptedSavedObjectsClient: decrypting(storedAt([], { secrets: {} })),
      });

      await expect(service.republishUnit('default')).resolves.toBe('republished');

      expect(prepareCredentials).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).toHaveBeenCalledWith({ unitId: 'default', unit, credentials: [] });
    });

    it('validates, writes with the read version, then publishes when a blob was re-sealed', async () => {
      const order: string[] = [];
      const soClient = soClientAt('v2');
      soClient.create.mockImplementation(async (type: string, attributes) => {
        order.push('write');
        return { ...asSavedObject(type, attributes), version: 'v2' };
      });
      const validateUnit = jest.fn(async () => {
        order.push('validate');
        return {};
      });
      const publishUnit = jest.fn(async () => {
        order.push('publish');
      });

      const service = createService({
        soClient,
        validateUnit,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).resolves.toBe('resealed');

      expect(order).toEqual(['validate', 'write', 'publish']);
      expect(validateUnit).toHaveBeenCalledWith({ unit, credentials: sealedFor(['es-prod']) });
      expect(soClient.create).toHaveBeenCalledWith(
        'streams-configuration',
        { unit_id: 'default', unit, secrets, sealed_credentials: storedFor(['es-prod']) },
        expect.objectContaining({
          id: 'default',
          overwrite: true,
          version: 'v1',
          initialNamespaces: ['*'],
        })
      );
      expect(publishUnit).toHaveBeenCalledWith({
        unitId: 'default',
        unit,
        credentials: sealedFor(['es-prod']),
      });
    });

    it('re-seals a document stored without a blob cache', async () => {
      const soClient = soClientAt('v2');
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt()),
      });

      await expect(service.republishUnit('default')).resolves.toBe('resealed');

      expect(soClient.create).toHaveBeenCalledTimes(1);
      expect(publishUnit).toHaveBeenCalledTimes(1);
    });

    it('skips the PUT when the re-seal write hits a version conflict', async () => {
      const soClient = soClientAt('v1');
      soClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError('streams-configuration', 'default')
      );
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).resolves.toBe('conflict');

      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('skips the PUT when the version moved before it', async () => {
      const soClient = soClientAt('v9');
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(storedFor(['es-prod']))),
      });

      await expect(service.republishUnit('default')).resolves.toBe('conflict');

      expect(publishUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('skips the PUT when a save landed after the re-seal write', async () => {
      const soClient = soClientAt('v3');
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).resolves.toBe('conflict');

      expect(soClient.create).toHaveBeenCalledTimes(1);
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('keeps the re-sealed blobs when publish fails after a re-seal', async () => {
      const soClient = soClientAt('v2');
      const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).rejects.toThrow('distributor down');

      expect(soClient.create).toHaveBeenCalledTimes(1);
      expect(soClient.delete).not.toHaveBeenCalled();
    });

    it('rejects and touches nothing when the stored document fails to decrypt', async () => {
      const soClient = soClientAt('v1');
      const encryptedSavedObjectsClient = {
        getDecryptedAsInternalUser: jest
          .fn()
          .mockRejectedValue(
            new EncryptionError(
              'Unable to decrypt attribute "secrets"',
              'secrets',
              EncryptionErrorOperation.Decryption
            )
          ),
      } as unknown as EncryptedSavedObjectsClient;
      const prepareCredentials = fakePrepareCredentials();
      const validateUnit = jest.fn();
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        validateUnit,
        prepareCredentials,
        encryptedSavedObjectsClient,
      });

      await expect(service.republishUnit('default')).rejects.toBeInstanceOf(EncryptionError);

      expect(prepareCredentials).not.toHaveBeenCalled();
      expect(validateUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('validates, writes and publishes nothing when the run is aborted before validation', async () => {
      const soClient = soClientAt('v1');
      const validateUnit = jest.fn();
      const publishUnit = jest.fn();
      const abortController = new AbortController();
      abortController.abort();

      const service = createService({
        soClient,
        validateUnit,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default', abortController.signal)).resolves.toBe(
        'aborted'
      );

      expect(validateUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('writes nothing when the run is aborted during validation', async () => {
      const soClient = soClientAt('v1');
      const abortController = new AbortController();
      const validateUnit = jest.fn(async () => {
        abortController.abort();
        return {};
      });
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        validateUnit,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default', abortController.signal)).resolves.toBe(
        'aborted'
      );

      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('keeps the re-sealed write and skips the PUT when aborted after the write', async () => {
      const soClient = soClientAt('v2');
      const abortController = new AbortController();
      soClient.create.mockImplementationOnce(async (type: string, attributes) => {
        abortController.abort();
        return { ...asSavedObject(type, attributes), version: 'v2' };
      });
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default', abortController.signal)).resolves.toBe(
        'aborted'
      );

      expect(publishUnit).not.toHaveBeenCalled();
      expect(soClient.create).toHaveBeenCalledTimes(1);
      expect(soClient.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['nothing was re-sealed', storedFor(['es-prod']), 'v1', 0],
      ['a blob was re-sealed', oldKidBlobs, 'v2', 1],
    ])(
      'skips the PUT when aborted during the version re-read and %s',
      async (_, sealedCredentials, currentVersion, writes) => {
        const soClient = soClientAt(currentVersion);
        const abortController = new AbortController();
        soClient.get.mockImplementation(async () => {
          abortController.abort();
          return { ...storedConfiguration, version: currentVersion };
        });
        const publishUnit = jest.fn();

        const service = createService({
          soClient,
          publishUnit,
          encryptedSavedObjectsClient: decrypting(storedAt(sealedCredentials)),
        });

        await expect(service.republishUnit('default', abortController.signal)).resolves.toBe(
          'aborted'
        );

        expect(soClient.get).toHaveBeenCalledTimes(1);
        expect(soClient.create).toHaveBeenCalledTimes(writes);
        expect(publishUnit).not.toHaveBeenCalled();
      }
    );

    it('skips the PUT without writing when aborted and nothing was re-sealed', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn();
      const abortController = new AbortController();
      abortController.abort();

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(storedFor(['es-prod']))),
      });

      await expect(service.republishUnit('default', abortController.signal)).resolves.toBe(
        'aborted'
      );

      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('fails with 503 and touches nothing when a unit with secrets has no preparer', async () => {
      const soClient = soClientAt('v1');
      const validateUnit = jest.fn();
      const publishUnit = jest.fn();

      const service = createService({
        soClient,
        validateUnit,
        publishUnit,
        prepareCredentials: null,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).rejects.toMatchObject({ statusCode: 503 });

      expect(validateUnit).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('writes nothing when publish fails and nothing was re-sealed', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn().mockRejectedValue(new Error('distributor down'));

      const service = createService({
        soClient,
        publishUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(storedFor(['es-prod']))),
      });

      await expect(service.republishUnit('default')).rejects.toThrow('distributor down');

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.delete).not.toHaveBeenCalled();
    });

    it('writes and publishes nothing when validation of the re-sealed unit fails', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn();
      const validateUnit = jest.fn().mockRejectedValue(new StatusError('invalid unit', 400));

      const service = createService({
        soClient,
        publishUnit,
        validateUnit,
        encryptedSavedObjectsClient: decrypting(storedAt(oldKidBlobs)),
      });

      await expect(service.republishUnit('default')).rejects.toThrow('invalid unit');

      expect(soClient.create).not.toHaveBeenCalled();
      expect(publishUnit).not.toHaveBeenCalled();
    });

    it('returns not_found when the unit was deleted after listing', async () => {
      const soClient = soClientAt('v1');
      const publishUnit = jest.fn();
      const encryptedSavedObjectsClient = {
        getDecryptedAsInternalUser: jest.fn().mockRejectedValue(notFoundError),
      } as unknown as EncryptedSavedObjectsClient;

      const service = createService({ soClient, publishUnit, encryptedSavedObjectsClient });

      await expect(service.republishUnit('default')).resolves.toBe('not_found');

      expect(publishUnit).not.toHaveBeenCalled();
    });
  });

  describe('with the real preparer and distributor client', () => {
    let keyDir: string;

    beforeEach(async () => {
      keyDir = await mkdtemp(join(tmpdir(), 'streams-unit-service-key-'));
      await writeKey('kid-1');
    });

    afterEach(async () => {
      await rm(keyDir, { recursive: true, force: true });
    });

    const writeKey = async (kid: string) => {
      await writeFile(join(keyDir, 'current-kid'), kid);
      await writeFile(join(keyDir, `streams-encryption-key.${kid}`), randomBytes(32));
    };

    // Real sealing and hashing, with the last configuration write fed back as the stored object.
    const createRealService = () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ valid: true, diagnostics: [] }),
      });
      const client = createConfigDistributorClient({
        config: { url: 'http://distributor.example', ssl: {} },
        logger: loggerMock.create(),
        fallbackTargetId: 'dev',
        fetchImpl,
      });
      const prepareCredentials = createCredentialPreparer({
        store: createEncryptionKeyStore({ path: keyDir }),
        resolveTargetId: client.resolveTargetId,
        logger: loggerMock.create(),
      });
      let stored: SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined;
      const soClient = createSoClient();
      soClient.create.mockImplementation(async (type: string, attributes) => {
        if (type === 'streams-configuration') {
          stored = asSavedObject(type, attributes as StreamsConfigurationSavedObjectAttributes);
        }
        return asSavedObject(type, attributes);
      });
      soClient.get.mockImplementation(async (type: string) => {
        if (type === 'streams-configuration' && stored) {
          return stored;
        }
        throw notFoundError;
      });
      const encryptedSavedObjectsClient = {
        getDecryptedAsInternalUser: jest.fn(async () => {
          if (!stored) {
            throw notFoundError;
          }
          return stored;
        }),
      } as unknown as EncryptedSavedObjectsClient;
      const service = new StreamsUnitService({
        soClient,
        logger: loggerMock.create(),
        validateUnit: client.validate,
        publishUnit: client.publish,
        prepareCredentials,
        encryptedSavedObjectsClient,
        canEncrypt: true,
      });
      const unitPuts = () =>
        fetchImpl.mock.calls
          .filter(([, init]) => init.method === 'PUT')
          .map(([, init]) => JSON.parse(init.body));

      return { service, soClient, unitPuts };
    };

    const saveTwice = async (betweenSaves: () => Promise<void> = async () => {}) => {
      const { service, unitPuts } = createRealService();

      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });
      await betweenSaves();
      // The UI re-sends the same value, which must not count as a change.
      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });

      return unitPuts();
    };

    it('keeps the same config_hash on a no-op re-save', async () => {
      const [first, second] = await saveTwice();

      expect(second.config_hash).toBe(first.config_hash);
      expect(second.credentials).toEqual(first.credentials);
    });

    it('changes config_hash after a key rotation', async () => {
      const [first, second] = await saveTwice(() => writeKey('kid-2'));

      expect(second.config_hash).not.toBe(first.config_hash);
      expect(second.credentials[0].ciphertext.startsWith('v1.kid-2.')).toBe(true);
    });

    it('re-seals under the new kid once after a rotation, then republishes the same hash', async () => {
      const { service, unitPuts } = createRealService();
      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });
      await writeKey('kid-2');

      await expect(service.republishUnit('default')).resolves.toBe('resealed');
      await expect(service.republishUnit('default')).resolves.toBe('republished');

      const [saved, resealed, steady] = unitPuts();
      expect(resealed.config_hash).not.toBe(saved.config_hash);
      expect(resealed.credentials[0].ciphertext.startsWith('v1.kid-2.')).toBe(true);
      expect(steady).toEqual(resealed);
    });

    it('writes and publishes nothing when current-kid is unreadable', async () => {
      const { service, soClient, unitPuts } = createRealService();
      await service.upsertUnit({ unitId: 'default', unit, ui_metadata: {}, secrets });
      await rm(join(keyDir, 'current-kid'));
      soClient.create.mockClear();

      await expect(service.republishUnit('default')).rejects.toMatchObject({ statusCode: 503 });

      expect(soClient.create).not.toHaveBeenCalled();
      expect(unitPuts()).toHaveLength(1);
    });
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
        secrets,
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
        secrets,
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
        secrets: { 'es-prod': 'new-secret' },
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
      secrets,
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
