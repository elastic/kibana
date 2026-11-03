/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { ApiKeysClient } from './client';
import { encodeApiKey } from './stored_keys';

const ES_KEY = encodeApiKey('es-id', 'es-secret');
const UIAM_KEY = encodeApiKey('uiam-id', 'essu_secret');
const SUBJECT = 'test thing : key';
const INVALIDATED = {
  invalidated_api_keys: ['es-id'],
  previously_invalidated_api_keys: [],
  error_count: 0,
};

const setup = () => {
  const security = securityServiceMock.createStart();
  const uiam = { grant: jest.fn(), invalidate: jest.fn().mockResolvedValue(INVALIDATED) };
  security.authc.apiKeys.uiam = uiam as never;
  security.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue(INVALIDATED);
  const logger = loggingSystemMock.createLogger();
  const client = new ApiKeysClient({ security, logger, pluginTag: 'test-plugin' });
  return { client, security, uiam, logger };
};

describe('ApiKeysClient.invalidateNow', () => {
  test('invalidates the ES key as the internal user and the UIAM key with its own credential', async () => {
    const { client, security, uiam } = setup();

    await expect(
      client.invalidateNow({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY }, { subject: SUBJECT })
    ).resolves.toEqual([]);

    expect(security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['es-id'],
    });
    const [[uiamRequest, params]] = uiam.invalidate.mock.calls;
    expect(uiamRequest.headers.authorization).toBe('ApiKey essu_secret');
    expect(params).toEqual({ id: 'uiam-id' });
  });

  test('skips user-created keys', async () => {
    const { client, security, uiam } = setup();

    await client.invalidateNow(
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true },
      { subject: SUBJECT }
    );

    expect(security.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
    expect(uiam.invalidate).not.toHaveBeenCalled();
  });

  test('returns the ES key when Elasticsearch did not find it', async () => {
    const { client, security } = setup();
    security.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce({
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await expect(client.invalidateNow({ apiKey: ES_KEY }, { subject: SUBJECT })).resolves.toEqual([
      { apiKeyId: 'es-id' },
    ]);
  });

  test('logs instead of throwing', async () => {
    const { client, security, uiam, logger } = setup();
    security.authc.apiKeys.invalidateAsInternalUser.mockRejectedValueOnce(new Error('es down'));
    uiam.invalidate.mockRejectedValueOnce(new Error('uiam down'));

    await expect(
      client.invalidateNow({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY }, { subject: SUBJECT })
    ).resolves.toEqual([]);

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to synchronously invalidate ES API key for ${SUBJECT}: es down`,
      expect.anything()
    );
    expect(logger.error).toHaveBeenCalledWith(
      `Failed to synchronously invalidate UIAM API key for ${SUBJECT}: uiam down`,
      expect.objectContaining({
        tags: ['serverless', 'test-plugin', 'uiam', 'uiam-api-key-invalidate'],
      })
    );
  });

  test('logs a stored UIAM value that is not a UIAM key', async () => {
    const { client, uiam, logger } = setup();

    await client.invalidateNow({ uiamApiKey: 'essu_raw' }, { subject: SUBJECT });

    expect(uiam.invalidate).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `Failed to synchronously invalidate UIAM API key for ${SUBJECT}: stored credential is not a UIAM API key`,
      expect.anything()
    );
  });
});
