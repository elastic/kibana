/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { ApiKeyService } from './api_key_service';

const NOW = '2026-01-01T00:00:00.000Z';
const POLICY_NAME = 'Action Policy: my-policy';

const toEnvelope = (id: string, secret: string): string =>
  Buffer.from(`${id}:${secret}`).toString('base64');

const ES_GRANT = { id: 'es-key-id', name: POLICY_NAME, api_key: 'es-key-secret' };
const UIAM_GRANT = { id: 'uiam-key-id', name: `uiam-${POLICY_NAME}`, api_key: 'essu_granted' };

interface SetupOptions {
  username?: string | null;
  authenticationType?: string;
  uiam?: boolean;
  authorization?: string;
}

const setup = ({
  username = 'test-user',
  authenticationType = 'token',
  uiam = false,
  authorization,
}: SetupOptions = {}) => {
  const grantAsInternalUser = jest.fn().mockResolvedValue(ES_GRANT);
  const uiamGrant = jest.fn().mockResolvedValue(UIAM_GRANT);
  const security = {
    authc: {
      getCurrentUser: jest
        .fn()
        .mockReturnValue(
          username === null ? null : { username, authentication_type: authenticationType }
        ),
      apiKeys: {
        grantAsInternalUser,
        uiam: uiam ? { grant: uiamGrant } : null,
      },
    },
  } as unknown as SecurityServiceStart;
  const request = httpServerMock.createKibanaRequest(
    authorization ? { headers: { authorization } } : { headers: {} }
  );
  const invalidationSavedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.create().get();
  const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

  return {
    service,
    request,
    grantAsInternalUser,
    uiamGrant,
    invalidationSavedObjectsClient,
    logger,
  };
};

const captureError = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error(`Expected an Error instance, received ${String(error)}`);
  }
  throw new Error('Expected the promise to reject');
};

const expectPlainError = (error: Error, message: string) => {
  expect(Boom.isBoom(error)).toBe(false);
  expect(error.message).toBe(message);
};

describe('ApiKeyService characterization', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('create - grant path (non api_key authentication)', () => {
    it.each(['token', 'basic', 'saml', 'realm'])(
      'grants an ES API key for authentication_type %s when UIAM is absent',
      async (authenticationType) => {
        const { service, request, grantAsInternalUser } = setup({ authenticationType });

        await expect(service.create(POLICY_NAME)).resolves.toEqual({
          apiKey: toEnvelope('es-key-id', 'es-key-secret'),
          owner: 'test-user',
          createdByUser: false,
        });
        expect(grantAsInternalUser).toHaveBeenCalledTimes(1);
        expect(grantAsInternalUser).toHaveBeenCalledWith(request, {
          name: POLICY_NAME,
          role_descriptors: {},
          metadata: { managed: true, kibana: { type: 'action_policy' } },
        });
      }
    );

    it('grants a UIAM API key only (no ES grant, no metadata) when UIAM is present', async () => {
      const { service, request, grantAsInternalUser, uiamGrant } = setup({ uiam: true });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: toEnvelope('uiam-key-id', 'essu_granted'),
        owner: 'test-user',
        createdByUser: false,
      });
      expect(uiamGrant).toHaveBeenCalledTimes(1);
      expect(uiamGrant).toHaveBeenCalledWith(request, { name: `uiam-${POLICY_NAME}` });
      expect(grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('takes the grant path even when the request carries an ApiKey header but authentication_type is not api_key', async () => {
      const { service, grantAsInternalUser } = setup({
        authenticationType: 'token',
        authorization: `ApiKey ${toEnvelope('header-id', 'header-secret')}`,
      });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: toEnvelope('es-key-id', 'es-key-secret'),
        owner: 'test-user',
        createdByUser: false,
      });
      expect(grantAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('does not fall back to an ES grant when the UIAM grant returns null', async () => {
      const { service, grantAsInternalUser, uiamGrant } = setup({ uiam: true });
      uiamGrant.mockResolvedValueOnce(null);

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(error, `Failed to create UIAM API key for action policy: ${POLICY_NAME}`);
      expect(grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('propagates the UIAM grant rejection unchanged without falling back to an ES grant', async () => {
      const { service, grantAsInternalUser, uiamGrant } = setup({ uiam: true });
      const failure = new Error('uiam unavailable');
      uiamGrant.mockRejectedValueOnce(failure);

      await expect(service.create(POLICY_NAME)).rejects.toBe(failure);
      expect(grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('throws a plain Error when the ES grant returns null', async () => {
      const { service, grantAsInternalUser } = setup();
      grantAsInternalUser.mockResolvedValueOnce(null);

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(error, `Failed to create ES API key for action policy: ${POLICY_NAME}`);
    });

    it('propagates the ES grant rejection unchanged', async () => {
      const { service, grantAsInternalUser } = setup();
      const failure = new Error('es unavailable');
      grantAsInternalUser.mockRejectedValueOnce(failure);

      await expect(service.create(POLICY_NAME)).rejects.toBe(failure);
    });

    it('returns apiKey null when the UIAM grant result lacks an api_key (current behavior)', async () => {
      const { service, uiamGrant } = setup({ uiam: true });
      uiamGrant.mockResolvedValueOnce({ id: 'uiam-key-id', name: 'n', api_key: '' });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: null,
        owner: 'test-user',
        createdByUser: false,
      });
    });

    it('returns apiKey null when the ES grant result lacks an id (current behavior)', async () => {
      const { service, grantAsInternalUser } = setup();
      grantAsInternalUser.mockResolvedValueOnce({ id: '', name: 'n', api_key: 'es-key-secret' });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: null,
        owner: 'test-user',
        createdByUser: false,
      });
    });
  });

  describe('create - missing user', () => {
    it.each([
      ['no current user', null],
      ['an empty username', ''],
    ])('throws a plain Error before any grant for %s', async (_label, username) => {
      const { service, grantAsInternalUser, uiamGrant } = setup({ username, uiam: true });

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(
        error,
        `Failed to create API key for action policy: ${POLICY_NAME} - unable to determine current user`
      );
      expect(grantAsInternalUser).not.toHaveBeenCalled();
      expect(uiamGrant).not.toHaveBeenCalled();
    });
  });

  describe('create - reuse path (authentication_type api_key)', () => {
    it.each([false, true])(
      'reuses an ES API key envelope from the header (uiam present: %s)',
      async (uiam) => {
        const envelope = toEnvelope('my-key-id', 'my-key-secret');
        const { service, grantAsInternalUser, uiamGrant } = setup({
          authenticationType: 'api_key',
          uiam,
          authorization: `ApiKey ${envelope}`,
        });

        await expect(service.create(POLICY_NAME)).resolves.toEqual({
          apiKey: envelope,
          owner: 'test-user',
          createdByUser: true,
        });
        expect(grantAsInternalUser).not.toHaveBeenCalled();
        expect(uiamGrant).not.toHaveBeenCalled();
      }
    );

    it('reuses a base64(id:essu_) envelope from the header when UIAM is present', async () => {
      const envelope = toEnvelope('uiam-id', 'essu_user-secret');
      const { service, grantAsInternalUser, uiamGrant } = setup({
        authenticationType: 'api_key',
        uiam: true,
        authorization: `ApiKey ${envelope}`,
      });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: envelope,
        owner: 'test-user',
        createdByUser: true,
      });
      expect(grantAsInternalUser).not.toHaveBeenCalled();
      expect(uiamGrant).not.toHaveBeenCalled();
    });

    it('throws a plain Error for a base64(id:essu_) envelope when UIAM is absent', async () => {
      const { service, grantAsInternalUser } = setup({
        authenticationType: 'api_key',
        authorization: `ApiKey ${toEnvelope('uiam-id', 'essu_user-secret')}`,
      });

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(error, 'UIAM API keys should only be used in serverless environments');
      expect(grantAsInternalUser).not.toHaveBeenCalled();
    });

    it.each([false, true])(
      'rejects a raw essu_ Cloud API key with Boom 400 (uiam present: %s)',
      async (uiam) => {
        const { service, grantAsInternalUser, uiamGrant } = setup({
          authenticationType: 'api_key',
          uiam,
          authorization: 'ApiKey essu_raw-cloud-secret',
        });

        const error = await captureError(service.create(POLICY_NAME));

        const message =
          `Cannot use a Cloud API key to create or update action policy "${POLICY_NAME}". ` +
          'Authenticate with a user session or a project-scoped Elasticsearch API key instead.';
        expect(Boom.isBoom(error)).toBe(true);
        expect(error.message).toBe(message);
        expect(Boom.isBoom(error) && error.output).toEqual({
          statusCode: 400,
          payload: { statusCode: 400, error: 'Bad Request', message },
          headers: {},
        });
        expect(Boom.isBoom(error) && error.data).toEqual({
          code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
        });
        expect(grantAsInternalUser).not.toHaveBeenCalled();
        expect(uiamGrant).not.toHaveBeenCalled();
      }
    );

    it('rejects a Bearer essu_ credential with the same Boom 400 since the scheme is not checked (current behavior)', async () => {
      const { service } = setup({
        authenticationType: 'api_key',
        uiam: true,
        authorization: 'Bearer essu_token',
      });

      const error = await captureError(service.create(POLICY_NAME));

      expect(Boom.isBoom(error) && error.output.statusCode).toBe(400);
      expect(Boom.isBoom(error) && error.data).toEqual({
        code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
      });
    });

    it('reuses a non-ApiKey scheme credential as long as it decodes to id:secret (current behavior)', async () => {
      const envelope = toEnvelope('basic-user', 'basic-password');
      const { service } = setup({
        authenticationType: 'api_key',
        authorization: `Basic ${envelope}`,
      });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: envelope,
        owner: 'test-user',
        createdByUser: true,
      });
    });

    it('throws a plain Error when there is no authorization header', async () => {
      const { service } = setup({ authenticationType: 'api_key' });

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(
        error,
        `Failed to extract API key from authorization header for action policy: ${POLICY_NAME}`
      );
    });

    it('throws a plain Error when the credential does not decode to id:secret', async () => {
      const { service } = setup({
        authenticationType: 'api_key',
        authorization: `ApiKey ${Buffer.from('no-colon-here').toString('base64')}`,
      });

      const error = await captureError(service.create(POLICY_NAME));

      expectPlainError(
        error,
        `Failed to parse API key credentials from authorization header for action policy: ${POLICY_NAME}`
      );
    });

    it('truncates a secret containing ":" to its first segment when re-encoding (current behavior)', async () => {
      const { service } = setup({
        authenticationType: 'api_key',
        authorization: `ApiKey ${toEnvelope('id-1', 'sec:ret')}`,
      });

      await expect(service.create(POLICY_NAME)).resolves.toEqual({
        apiKey: toEnvelope('id-1', 'sec'),
        owner: 'test-user',
        createdByUser: true,
      });
    });
  });

  describe('markApiKeysForInvalidation', () => {
    const successResponse = (count: number) => ({
      saved_objects: Array.from({ length: count }, (_, index) => ({
        id: `pending-${index}`,
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: {},
        references: [],
      })),
    });

    it('writes one exact pending-invalidation doc per queueable input form in a single bulkCreate', async () => {
      const { service, invalidationSavedObjectsClient } = setup();
      const apiKeys = [
        toEnvelope('es-id', 'es-secret'),
        toEnvelope('uiam-id', 'essu_uiam-secret'),
        'essu_raw-cloud-secret',
        'not a key!!',
        '',
      ];
      invalidationSavedObjectsClient.bulkCreate.mockResolvedValueOnce(successResponse(3));

      // A raw essu_ key carries no id and an empty key has nothing to invalidate, so neither is
      // written, but both still report success.
      await expect(service.markApiKeysForInvalidation(apiKeys)).resolves.toEqual([
        { success: true },
        { success: true },
        { success: true },
        { success: true },
        { success: true },
      ]);

      expect(invalidationSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(invalidationSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'es-id', createdAt: NOW },
        },
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'uiam-id', createdAt: NOW, uiamApiKey: 'essu_uiam-secret' },
        },
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: '\ufffd\ufffdZ\ufffd\ufffd', createdAt: NOW },
        },
      ]);
    });

    it('drops the third and later ":" segments of the secret, so a split essu_ value is still detected (current behavior)', async () => {
      const { service, invalidationSavedObjectsClient } = setup();
      invalidationSavedObjectsClient.bulkCreate.mockResolvedValueOnce(successResponse(1));

      await service.markApiKeysForInvalidation([toEnvelope('uiam-id', 'essu_a:b')]);

      expect(invalidationSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'uiam-id', createdAt: NOW, uiamApiKey: 'essu_a' },
        },
      ]);
    });

    it('returns [] without writing or logging for an empty list', async () => {
      const { service, invalidationSavedObjectsClient, logger } = setup();

      await expect(service.markApiKeysForInvalidation([])).resolves.toEqual([]);
      expect(invalidationSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('reports every key as failed and logs once with every decoded id when bulkCreate throws', async () => {
      const { service, invalidationSavedObjectsClient, logger } = setup();
      const failure = new Error('index read-only');
      invalidationSavedObjectsClient.bulkCreate.mockRejectedValueOnce(failure);

      await expect(
        service.markApiKeysForInvalidation([
          toEnvelope('id-a', 'secret'),
          toEnvelope('id-b', 'essu_secret'),
        ])
      ).resolves.toEqual([
        { success: false, message: 'index read-only' },
        { success: false, message: 'index read-only' },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to bulk mark list of API keys ["id-a", "id-b"] for invalidation: index read-only',
        { error: { stack_trace: failure.stack } }
      );
    });

    it('reports an undefined message when bulkCreate throws a non-Error (current behavior)', async () => {
      const { service, invalidationSavedObjectsClient, logger } = setup();
      invalidationSavedObjectsClient.bulkCreate.mockRejectedValueOnce('string failure');

      await expect(
        service.markApiKeysForInvalidation([toEnvelope('id-a', 'secret')])
      ).resolves.toEqual([{ success: false, message: undefined }]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to bulk mark list of API keys ["id-a"] for invalidation: undefined',
        { error: { stack_trace: undefined } }
      );
    });

    it('maps per-object errors and missing entries index by index, logging each', async () => {
      const { service, invalidationSavedObjectsClient, logger } = setup();
      invalidationSavedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'pending-0',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            attributes: {},
            references: [],
          },
          {
            id: 'pending-1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            attributes: {},
            references: [],
            error: { statusCode: 409, error: 'Conflict', message: 'version conflict' },
          },
        ],
      });

      await expect(
        service.markApiKeysForInvalidation([
          toEnvelope('ok-id', 'secret'),
          toEnvelope('bad-id', 'secret'),
          toEnvelope('missing-id', 'secret'),
        ])
      ).resolves.toEqual([
        { success: true },
        { success: false, message: 'version conflict' },
        { success: false, message: 'Saved object was not returned by bulkCreate' },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        'Failed to mark API key "bad-id" for invalidation: version conflict'
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        'Failed to mark API key "missing-id" for invalidation: Saved object was not returned by bulkCreate'
      );
    });
  });
});
