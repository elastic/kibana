/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  type ActionPolicySavedObjectAttributes,
} from '../../saved_objects';
import { createMockApiKeyService } from '../services/api_key_service/api_key_service.mock';
import type { ApiKeyAttributes } from '../services/api_key_service/api_key_service';
import { createActionPolicySavedObjectService } from '../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createMockLicenseService } from '../services/license_service/license_service.mock';
import { createActionPolicyEventPublisher } from '../events/action_policy_event_publisher/action_policy_event_publisher.mock';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { ActionPolicyClient } from './action_policy_client';

type PointInTimeFinder = Awaited<
  ReturnType<EncryptedSavedObjectsClient['createPointInTimeFinderDecryptedAsInternalUser']>
>;

const POLICY_ID = 'policy-1';
const OLD_KEY = 'old-stored-key';

const GRANTED_KEY: ApiKeyAttributes = {
  apiKey: 'granted-key',
  owner: 'test-user',
  createdByUser: false,
};
const USER_KEY: ApiKeyAttributes = {
  apiKey: 'user-own-key',
  owner: 'api-key-user',
  createdByUser: true,
};

const existingAttributes: ActionPolicySavedObjectAttributes = {
  name: 'existing-policy',
  description: 'existing description',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'wf-1' }],
  apiKey: OLD_KEY,
  apiKeyOwner: 'old-owner',
  apiKeyCreatedByUser: false,
  createdBy: { profile_uid: 'creator_uid' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedBy: { profile_uid: 'creator_uid' },
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const policyData = {
  name: 'my-policy',
  description: 'my description',
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
};

const setup = ({ namespace }: { namespace: string | undefined } = { namespace: 'default' }) => {
  const {
    actionPolicySavedObjectService,
    mockSavedObjectsClient,
    mockEncryptedSavedObjectsClient,
  } = createActionPolicySavedObjectService();
  const { userService } = createUserService();
  const apiKeyService = createMockApiKeyService();
  const { loggerService, mockLogger } = createLoggerService();
  const { publisher } = createActionPolicyEventPublisher();

  const client = new ActionPolicyClient(
    actionPolicySavedObjectService,
    userService,
    apiKeyService,
    mockEncryptedSavedObjectsClient,
    namespace,
    createMockLicenseService(),
    loggerService,
    httpServerMock.createKibanaRequest(),
    'user',
    publisher
  );

  mockSavedObjectsClient.create.mockResolvedValue({
    id: POLICY_ID,
    type: ACTION_POLICY_SAVED_OBJECT_TYPE,
    attributes: {} as ActionPolicySavedObjectAttributes,
    references: [],
  });
  mockSavedObjectsClient.get.mockResolvedValue({
    id: POLICY_ID,
    type: ACTION_POLICY_SAVED_OBJECT_TYPE,
    attributes: existingAttributes,
    references: [],
    version: 'WzEsMV0=',
  });
  mockSavedObjectsClient.update.mockResolvedValue({
    id: POLICY_ID,
    type: ACTION_POLICY_SAVED_OBJECT_TYPE,
    attributes: {},
    references: [],
    version: 'WzIsMV0=',
  });
  mockSavedObjectsClient.delete.mockResolvedValue({});

  const decryptsTo = (attributes: Partial<ActionPolicySavedObjectAttributes>) =>
    mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: POLICY_ID,
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      attributes,
      references: [],
    });

  return {
    client,
    apiKeyService,
    mockSavedObjectsClient,
    mockEncryptedSavedObjectsClient,
    mockLogger,
    decryptsTo,
  };
};

/** The key list of every `markApiKeysForInvalidation` call, in call order. */
const queuedKeys = (apiKeyService: ReturnType<typeof createMockApiKeyService>) =>
  apiKeyService.markApiKeysForInvalidation.mock.calls.map(([apiKeys]) => apiKeys);

describe('ActionPolicyClient API key characterization', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('createActionPolicy', () => {
    it.each([
      ['granted', GRANTED_KEY],
      ['user-provided', USER_KEY],
    ])('stores the %s key attributes and queues nothing on success', async (_label, auth) => {
      const { client, apiKeyService, mockSavedObjectsClient } = setup();
      apiKeyService.create.mockResolvedValueOnce(auth);

      await client.createActionPolicy({ data: policyData, options: { id: POLICY_ID } });

      expect(apiKeyService.create).toHaveBeenCalledTimes(1);
      expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: my-policy');
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          apiKey: auth.apiKey,
          apiKeyOwner: auth.owner,
          apiKeyCreatedByUser: auth.createdByUser,
        }),
        { id: POLICY_ID, overwrite: false }
      );
      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it.each([
      ['a generic error', new Error('storage error')],
      [
        'a conflict',
        SavedObjectsErrorHelpers.createConflictError(ACTION_POLICY_SAVED_OBJECT_TYPE, POLICY_ID),
      ],
    ])('does not queue a user-provided new key on %s', async (_label, failure) => {
      const { client, apiKeyService, mockSavedObjectsClient } = setup();
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);
      mockSavedObjectsClient.create.mockRejectedValueOnce(failure);

      await expect(
        client.createActionPolicy({ data: policyData, options: { id: POLICY_ID } })
      ).rejects.toBeDefined();

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it('neither writes nor queues when key creation rejects', async () => {
      const { client, apiKeyService, mockSavedObjectsClient } = setup();
      const failure = Boom.badRequest('cloud key', {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
      });
      apiKeyService.create.mockRejectedValueOnce(failure);

      await expect(client.createActionPolicy({ data: policyData })).rejects.toBe(failure);
      expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(queuedKeys(apiKeyService)).toEqual([]);
    });
  });

  describe('updateActionPolicy', () => {
    const update = (client: ActionPolicyClient) =>
      client.updateActionPolicy({ id: POLICY_ID, data: { name: 'renamed' } });

    it.each([
      ['createdByUser false', { apiKey: OLD_KEY, apiKeyCreatedByUser: false }, [[OLD_KEY]]],
      ['createdByUser absent', { apiKey: OLD_KEY }, [[OLD_KEY]]],
      ['createdByUser true', { apiKey: OLD_KEY, apiKeyCreatedByUser: true }, []],
      ['no apiKey', { apiKeyCreatedByUser: false }, []],
    ])(
      'on success queues only the old key per its decrypted auth (%s)',
      async (_label, decrypted, expected) => {
        const { client, apiKeyService, decryptsTo } = setup();
        decryptsTo(decrypted);
        apiKeyService.create.mockResolvedValueOnce(USER_KEY);

        await update(client);

        expect(queuedKeys(apiKeyService)).toEqual(expected);
      }
    );

    it('queues nothing on success when decrypting the old auth fails', async () => {
      const { client, apiKeyService, mockEncryptedSavedObjectsClient } = setup();
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('cannot decrypt')
      );

      await update(client);

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it('queues neither the user-provided new key nor the old one when the write fails', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));

      await expect(update(client)).rejects.toThrow('storage error');

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it.each([
      ['default', { namespace: 'default' }],
      ['space-a', { namespace: 'space-a' }],
      [undefined, undefined],
    ])(
      'decrypts the old auth as internal user with namespace %s',
      async (namespace, expectedOptions) => {
        const { client, mockEncryptedSavedObjectsClient, decryptsTo } = setup({ namespace });
        decryptsTo({ apiKey: OLD_KEY });

        await update(client);

        expect(mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
        expect(mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          POLICY_ID,
          expectedOptions
        );
      }
    );
  });

  describe('upsertActionPolicy', () => {
    it('does not queue the user-provided new key when the create branch conflicts', async () => {
      const { client, apiKeyService, mockSavedObjectsClient } = setup();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          POLICY_ID
        )
      );
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ACTION_POLICY_SAVED_OBJECT_TYPE, POLICY_ID)
      );
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);

      await expect(
        client.upsertActionPolicy({ id: POLICY_ID, data: policyData })
      ).rejects.toThrow();

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it('does not queue the user-provided new key when the replace write fails', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));

      await expect(client.upsertActionPolicy({ id: POLICY_ID, data: policyData })).rejects.toThrow(
        'storage error'
      );

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it('queues only the old Kibana-owned key after a successful replace', async () => {
      const { client, apiKeyService, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });

      await client.upsertActionPolicy({ id: POLICY_ID, data: policyData });

      expect(queuedKeys(apiKeyService)).toEqual([[OLD_KEY]]);
    });
  });

  describe('API key rotation', () => {
    it('writes the new key attributes, then queues only the old Kibana-owned key', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);

      await client.updateActionPolicyApiKey({ id: POLICY_ID });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        POLICY_ID,
        {
          ...existingAttributes,
          apiKey: USER_KEY.apiKey,
          apiKeyOwner: USER_KEY.owner,
          apiKeyCreatedByUser: true,
          updatedBy: { profile_uid: 'elastic_profile_uid' },
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        { version: 'WzEsMV0=', mergeAttributes: false }
      );
      expect(queuedKeys(apiKeyService)).toEqual([[OLD_KEY]]);
      expect(apiKeyService.markApiKeysForInvalidation.mock.invocationCallOrder[0]).toBeGreaterThan(
        mockSavedObjectsClient.update.mock.invocationCallOrder[0]
      );
    });

    it('does not queue the user-provided new key when the write fails', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });
      apiKeyService.create.mockResolvedValueOnce(USER_KEY);
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));

      await expect(client.updateActionPolicyApiKey({ id: POLICY_ID })).rejects.toThrow(
        'storage error'
      );

      expect(queuedKeys(apiKeyService)).toEqual([]);
    });

    it('reports a Cloud API key rejection as INTERNAL_SERVER_ERROR in the bulk response (current behavior)', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo({ apiKey: OLD_KEY, apiKeyCreatedByUser: false });
      apiKeyService.create.mockRejectedValue(
        Boom.badRequest('cloud key not supported', {
          code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
        })
      );

      await expect(client.bulkUpdateActionPoliciesApiKey({ ids: [POLICY_ID] })).resolves.toEqual({
        affected_count: 0,
        errors: [
          {
            id: POLICY_ID,
            error: {
              code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR,
              message: 'cloud key not supported',
            },
          },
        ],
      });
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
      expect(queuedKeys(apiKeyService)).toEqual([]);
    });
  });

  describe('deleteActionPolicy', () => {
    it.each([
      ['createdByUser false', { apiKey: OLD_KEY, apiKeyCreatedByUser: false }, [[OLD_KEY]]],
      ['createdByUser absent', { apiKey: OLD_KEY }, [[OLD_KEY]]],
      ['createdByUser true', { apiKey: OLD_KEY, apiKeyCreatedByUser: true }, []],
    ])('queues per decrypted auth (%s) and deletes', async (_label, decrypted, expected) => {
      const { client, apiKeyService, mockSavedObjectsClient, decryptsTo } = setup();
      decryptsTo(decrypted);

      await client.deleteActionPolicy({ id: POLICY_ID });

      expect(queuedKeys(apiKeyService)).toEqual(expected);
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        POLICY_ID
      );
    });

    it('still deletes without queueing when decrypting the auth fails (current behavior)', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, mockEncryptedSavedObjectsClient } =
        setup();
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('cannot decrypt')
      );

      await client.deleteActionPolicy({ id: POLICY_ID });

      expect(queuedKeys(apiKeyService)).toEqual([]);
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        POLICY_ID
      );
    });
  });

  describe('bulkDeleteActionPolicies', () => {
    it('queues Kibana-owned keys in id order in one call and skips user-owned or unresolved ones', async () => {
      const { client, apiKeyService, mockSavedObjectsClient, mockEncryptedSavedObjectsClient } =
        setup({ namespace: 'space-a' });
      const finder = {
        async *find() {
          yield {
            saved_objects: [
              { id: 'p-user', attributes: { apiKey: 'k-user', apiKeyCreatedByUser: true } },
              { id: 'p-absent', attributes: { apiKey: 'k-absent' } },
              { id: 'p-owned', attributes: { apiKey: 'k-owned', apiKeyCreatedByUser: false } },
              { id: 'p-other', attributes: { apiKey: 'k-other', apiKeyCreatedByUser: false } },
            ],
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      };
      mockEncryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValueOnce(
        finder as unknown as PointInTimeFinder
      );
      const ids = ['p-owned', 'p-user', 'p-missing', 'p-absent'];
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: ids.map((id) => ({ id, type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true })),
      });

      await expect(client.bulkDeleteActionPolicies({ ids })).resolves.toEqual({
        affected_count: 4,
        errors: [],
      });

      expect(
        mockEncryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        perPage: 4,
        namespaces: ['space-a'],
      });
      expect(queuedKeys(apiKeyService)).toEqual([['k-owned', 'k-absent']]);
    });
  });
});
