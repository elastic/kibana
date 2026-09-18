/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { ActionsClientContext } from '../../../../actions_client';
import { getConnectorType } from '../../../../fixtures';
import { upgrade } from './upgrade';

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const evictClientPool = jest.fn();

const specVersions = {
  getActiveVersion: jest.fn().mockReturnValue('1.1.0'),
  getActiveSpec: jest.fn(),
  getSpec: jest.fn().mockResolvedValue({}),
  hasVersion: jest.fn(),
};

const configSchema = z.object({ baseUrl: z.string(), region: z.string().optional() });
const secretsSchema = z.object({ apiKey: z.string() });
const configCustomValidator = jest.fn();

const actionTypeRegistry = {
  get: jest.fn(),
  isDeprecated: jest.fn().mockReturnValue(false),
  getUtils: jest.fn().mockReturnValue({}),
} as unknown as ActionTypeRegistry;

const context = {
  actionTypeRegistry,
  authorization: authorization as unknown as ActionsAuthorization,
  unsecuredSavedObjectsClient,
  encryptedSavedObjectsClient,
  auditLogger,
  logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
  inMemoryConnectors: [],
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
  evictClientPool,
} as unknown as ActionsClientContext;

const rawAction = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  type: 'action',
  attributes: {
    actionTypeId: '.abuseipdb',
    name: 'pinned',
    isMissingSecrets: false,
    config: { baseUrl: 'http://127.0.0.1:8090' },
    secrets: { apiKey: 'k' },
    authMode: 'shared',
    specVersion: '1.0.0',
    ...overrides,
  },
  references: [],
  version: 'WzEsMV0=',
});

describe('upgrade()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    specVersions.getActiveVersion.mockReturnValue('1.1.0');
    (actionTypeRegistry.get as jest.Mock).mockReturnValue(
      getConnectorType({
        id: '.abuseipdb',
        source: ACTION_TYPE_SOURCES.spec,
        specVersions,
        validate: {
          config: { schema: configSchema, customValidator: configCustomValidator },
          secrets: { schema: secretsSchema },
          params: { schema: z.object({}) },
        },
      })
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(rawAction() as never);
    unsecuredSavedObjectsClient.create.mockImplementation(async (_type, attributes) => ({
      id: 'c1',
      type: 'action',
      attributes,
      references: [],
    }));
  });

  it('validates stored config and secrets against the target and rewrites only the pin', async () => {
    const result = await upgrade({ context, id: 'c1', specVersion: '1.1.0' });

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'action',
      'c1',
      {}
    );
    expect(specVersions.getSpec).toHaveBeenCalledWith('1.1.0');
    expect(configCustomValidator).toHaveBeenCalledWith(
      { baseUrl: 'http://127.0.0.1:8090' },
      expect.objectContaining({ specVersion: '1.1.0' })
    );
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'action',
      {
        ...rawAction().attributes,
        specVersion: '1.1.0',
      },
      { id: 'c1', overwrite: true, references: [], version: 'WzEsMV0=' }
    );
    expect(evictClientPool).toHaveBeenCalledWith('c1');
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'connector_upgrade', outcome: 'unknown' }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'c1',
        actionTypeId: '.abuseipdb',
        name: 'pinned',
        specVersion: '1.1.0',
        isPreconfigured: false,
        isSystemAction: false,
        authMode: 'shared',
      })
    );
  });

  it('scopes the decrypt call to the current space', async () => {
    await upgrade({ context: { ...context, spaceId: 'team-a' }, id: 'c1', specVersion: '1.1.0' });

    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'action',
      'c1',
      { namespace: 'team-a' }
    );
  });

  it('returns 400 when the target is not the active version', async () => {
    await expect(upgrade({ context, id: 'c1', specVersion: '1.0.0' })).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining('Only the active spec version 1.1.0'),
    });
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  it('returns 400 when the connector type is not spec-versioned', async () => {
    (actionTypeRegistry.get as jest.Mock).mockReturnValue(getConnectorType({ id: '.slack' }));

    await expect(upgrade({ context, id: 'c1', specVersion: '1.1.0' })).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining('does not support spec versions'),
    });
  });

  it('returns 400 when the stored config does not validate against the target', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(
      rawAction({ config: { baseUrl: 42 } }) as never
    );

    await expect(upgrade({ context, id: 'c1', specVersion: '1.1.0' })).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining('error validating connector type config'),
    });
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  it('returns 400 for preconfigured or system connectors', async () => {
    await expect(
      upgrade({
        context: {
          ...context,
          inMemoryConnectors: [{ id: 'c1' }],
        } as unknown as ActionsClientContext,
        id: 'c1',
        specVersion: '1.1.0',
      })
    ).rejects.toMatchObject({ output: { statusCode: 400 } });
  });

  it('propagates not found from the saved object read', async () => {
    const notFound = Object.assign(new Error('Saved object [action/missing] not found'), {
      output: { statusCode: 404 },
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValue(notFound);

    await expect(upgrade({ context, id: 'missing', specVersion: '1.1.0' })).rejects.toBe(notFound);
  });

  it('logs an audit failure and rethrows when authorization fails', async () => {
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(upgrade({ context, id: 'c1', specVersion: '1.1.0' })).rejects.toThrow(
      'Unauthorized'
    );
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'connector_upgrade', outcome: 'failure' }),
      })
    );
  });
});
