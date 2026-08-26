/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { z } from '@kbn/zod/v4';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { upgrade } from './upgrade';

const id = 'connector-id';
const specId = '.declarative-example';
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const authorization = actionsAuthorizationMock.create();
const evictClientPool = jest.fn();
const ensureActionTypeEnabled = jest.fn();
const getConnectorValidation = jest.fn();
const tryResolveActionType = jest.fn();
const getActionType = jest.fn();
const getUtils = jest.fn().mockReturnValue({});

const actionType = {
  getConnectorValidation,
  validate: {
    config: { schema: z.object({}) },
    secrets: { schema: z.object({}) },
    params: { schema: z.object({}) },
  },
};

const context = {
  authorization,
  encryptedSavedObjectsClient,
  unsecuredSavedObjectsClient,
  actionTypeRegistry: {
    tryResolveActionType,
    get: getActionType,
    ensureActionTypeEnabled,
    getUtils,
    isDeprecated: jest.fn().mockReturnValue(false),
  } as unknown as ActionTypeRegistry,
  isESOCanEncrypt: true,
  request: {},
  auditLogger: { log: jest.fn() },
  evictClientPool,
} as unknown as ActionsClientContext;

const savedObject = {
  id,
  type: 'action',
  version: 'WzEsMV0=',
  references: [],
  attributes: {
    actionTypeId: '.declarative',
    specId,
    specVersion: '1.0.0',
    name: 'Example',
    isMissingSecrets: false,
    config: { endpoint: 'https://example.test' },
    secrets: { token: 'secret' },
  },
};

const setActiveVersion = (version: string) => {
  tryResolveActionType.mockReturnValue({
    registeredActionTypeId: '.declarative',
    actionType,
    specId,
    connectorSpec: { version },
  });
};

describe('upgrade()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(savedObject);
    unsecuredSavedObjectsClient.update.mockResolvedValue({
      ...savedObject,
      attributes: { specVersion: '2.0.0' },
    } as never);
    getConnectorValidation.mockResolvedValue({
      config: { schema: z.object({ endpoint: z.url() }).strict() },
      secrets: { schema: z.object({ token: z.string() }).strict() },
      params: { schema: z.object({}) },
    });
    getActionType.mockReturnValue(actionType);
  });

  it('returns current without mutating an already-current connector', async () => {
    setActiveVersion('1.0.0');

    const result = await upgrade({ context, id });
    expect(result).toMatchObject({
      status: 'current',
      fromVersion: '1.0.0',
      toVersion: '1.0.0',
      connector: {
        specVersion: '1.0.0',
        activeSpecVersion: '1.0.0',
      },
    });
    expect(result.connector).not.toHaveProperty('secrets');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(evictClientPool).not.toHaveBeenCalled();
  });

  it('repins a compatible connector with optimistic concurrency', async () => {
    // ESO is mocked here: this verifies decrypted secrets only flow into validation, the write is
    // pin-only, and the response omits secrets. Real encryption remains an integration-test concern.
    setActiveVersion('2.0.0');

    const result = await upgrade({ context, id });
    expect(result).toMatchObject({
      status: 'upgraded',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      connector: {
        specVersion: '2.0.0',
        activeSpecVersion: '2.0.0',
      },
    });
    expect(result.connector).not.toHaveProperty('secrets');
    expect(result.connector.config).toEqual(savedObject.attributes.config);

    expect(getConnectorValidation).toHaveBeenCalledWith('2.0.0', specId);
    expect(getActionType).toHaveBeenCalledWith(savedObject.attributes.actionTypeId);
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'action',
      id,
      {}
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'action',
      id,
      { specVersion: '2.0.0' },
      { version: 'WzEsMV0=' }
    );
    expect(savedObject.attributes).toEqual({
      actionTypeId: '.declarative',
      specId,
      specVersion: '1.0.0',
      name: 'Example',
      isMissingSecrets: false,
      config: { endpoint: 'https://example.test' },
      secrets: { token: 'secret' },
    });
    expect(evictClientPool).toHaveBeenCalledWith(id);
  });

  it('returns reconfiguration_required without mutation for incompatible values', async () => {
    setActiveVersion('2.0.0');
    getConnectorValidation.mockResolvedValueOnce({
      config: { schema: z.object({ replacement: z.string() }).strict() },
      secrets: { schema: z.object({ token: z.string() }).strict() },
      params: { schema: z.object({}) },
    });

    const result = await upgrade({ context, id });
    expect(result).toMatchObject({
      status: 'reconfiguration_required',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      connector: {
        specVersion: '1.0.0',
        activeSpecVersion: '2.0.0',
      },
    });
    expect(result.connector).not.toHaveProperty('secrets');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(evictClientPool).not.toHaveBeenCalled();
  });

  it('rejects a spec resolved from a different registered provider without mutation', async () => {
    setActiveVersion('2.0.0');
    tryResolveActionType.mockReturnValue({
      registeredActionTypeId: '.different-provider',
      actionType,
      specId,
      connectorSpec: { version: '2.0.0' },
    });

    await expect(upgrade({ context, id })).rejects.toThrow(
      'Connector "connector-id" is owned by action type ".declarative", but spec ".declarative-example" resolved to ".different-provider".'
    );
    expect(getActionType).not.toHaveBeenCalled();
    expect(getConnectorValidation).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(evictClientPool).not.toHaveBeenCalled();
  });

  it('rejects an invalid persisted spec version without mutation', async () => {
    setActiveVersion('2.0.0');
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...savedObject,
      attributes: {
        ...savedObject.attributes,
        specVersion: 'not-semver',
      },
    });

    await expect(upgrade({ context, id })).rejects.toMatchObject({
      output: {
        statusCode: 400,
        payload: expect.objectContaining({
          message: 'Connector "connector-id" has invalid pinned spec version "not-semver".',
        }),
      },
    });
    expect(getActionType).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(evictClientPool).not.toHaveBeenCalled();
  });

  it('rejects an invalid active spec version without mutation', async () => {
    setActiveVersion('not-semver');

    await expect(upgrade({ context, id })).rejects.toMatchObject({
      output: {
        statusCode: 400,
        payload: expect.objectContaining({
          message:
            'Active spec for connector type ".declarative-example" has invalid version "not-semver".',
        }),
      },
    });
    expect(getActionType).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(evictClientPool).not.toHaveBeenCalled();
  });

  it('rejects a downgrade without mutation', async () => {
    setActiveVersion('0.9.0');

    await expect(upgrade({ context, id })).rejects.toThrow(
      'Cannot downgrade connector "connector-id" from spec version "1.0.0" to "0.9.0".'
    );
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects connectors without a declarative spec pin', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...savedObject,
      attributes: {
        ...savedObject.attributes,
        specId: undefined,
        specVersion: undefined,
      },
    });

    await expect(upgrade({ context, id })).rejects.toThrow(
      'Connector "connector-id" is not pinned to a declarative connector spec.'
    );
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('does not classify configuration validator failures as schema incompatibility', async () => {
    setActiveVersion('2.0.0');
    getConnectorValidation.mockResolvedValueOnce({
      config: {
        schema: z.object({ endpoint: z.url() }).strict(),
        customValidator: () => {
          throw new Error('endpoint is blocked by xpack.actions.allowedHosts');
        },
      },
      secrets: { schema: z.object({ token: z.string() }).strict() },
      params: { schema: z.object({}) },
    });

    await expect(upgrade({ context, id })).rejects.toThrow(
      'endpoint is blocked by xpack.actions.allowedHosts'
    );
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });
});
