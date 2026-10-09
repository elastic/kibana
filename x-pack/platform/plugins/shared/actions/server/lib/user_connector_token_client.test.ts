/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./ears/revoke_ears_credentials');

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { UserConnectorTokenClient } from './user_connector_token_client';
import { revokeEarsCredentials } from './ears/revoke_ears_credentials';
import { actionsConfigMock } from '../actions_config.mock';
import type { Logger } from '@kbn/core/server';
import type { UserConnectorToken } from '../types';

const mockRevokeEarsCredentials = revokeEarsCredentials as jest.MockedFunction<
  typeof revokeEarsCredentials
>;

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const configurationUtilities = actionsConfigMock.create();

let userClient: UserConnectorTokenClient;
let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
});
beforeEach(() => {
  clock.reset();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  mockRevokeEarsCredentials.mockResolvedValue(undefined);
  userClient = new UserConnectorTokenClient({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
    configurationUtilities,
  });
});
afterAll(() => clock.restore());

describe('UserConnectorTokenClient', () => {
  describe('create()', () => {
    test('creates user_connector_token with profileUid and credentials', async () => {
      const expiresAt = new Date().toISOString();
      const savedObjectCreateResult = {
        id: 'mock-saved-object-id',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'testtokenvalue',
            refreshToken: 'testrefreshtoken',
          },
          expiresAt,
          createdAt: '2021-01-01T12:00:00.000Z',
          updatedAt: '2021-01-01T12:00:00.000Z',
        },
        references: [],
      };

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
      const result = await userClient.create({
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentials: {
          accessToken: 'testtokenvalue',
          refreshToken: 'testrefreshtoken',
        },
        expiresAtMillis: expiresAt,
        credentialType: 'oauth',
      });

      expect(result).toMatchObject({
        id: 'per-user:mock-saved-object-id',
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
        credentials: {
          accessToken: 'testtokenvalue',
          refreshToken: 'testrefreshtoken',
        },
        expiresAt,
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'user_connector_token',
        expect.objectContaining({
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
        }),
        { id: 'mock-saved-object-id' }
      );
    });

    test('throws error if credentials are empty', async () => {
      await expect(
        userClient.create({
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentials: {},
        })
      ).rejects.toThrow('Per-user credentials are required to create a user connector token');
    });
  });

  describe('get()', () => {
    test('retrieves per-user token by profileUid and connectorId', async () => {
      const expiresAt = new Date().toISOString();
      const createdAt = new Date().toISOString();
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: 'token-id-1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'user-profile-123',
              connectorId: '123',
              credentialType: 'oauth',
              credentials: {},
              createdAt,
              expiresAt,
              updatedAt: createdAt,
            },
            score: 1,
            references: [],
          },
        ],
      };

      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        references: [],
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'testtokenvalue',
            refreshToken: 'testrefreshtoken',
          },
          createdAt,
          expiresAt,
          updatedAt: createdAt,
        },
      });

      const result = await userClient.get({
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
      });

      expect(result).toEqual({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-1',
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'testtokenvalue',
            refreshToken: 'testrefreshtoken',
          },
          createdAt,
          expiresAt,
          updatedAt: createdAt,
        },
      });
    });

    test('returns null if no tokens found', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        per_page: 10,
        page: 1,
        saved_objects: [],
      });

      const result = await userClient.get({
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
      });

      expect(result).toEqual({ connectorToken: null, hasErrors: false });
    });
  });

  describe('getOAuthPersonalToken()', () => {
    test('retrieves and parses OAuth credentials', async () => {
      const expiresAt = new Date().toISOString();
      const createdAt = new Date().toISOString();

      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: 'token-id-1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'user-profile-123',
              connectorId: '123',
              credentialType: 'oauth',
              credentials: {},
              createdAt,
              expiresAt,
              updatedAt: createdAt,
            },
            score: 1,
            references: [],
          },
        ],
      });

      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        references: [],
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
          },
          createdAt,
          expiresAt,
          updatedAt: createdAt,
        },
      });

      const result = await userClient.getOAuthPersonalToken({
        profileUid: 'user-profile-123',
        connectorId: '123',
      });

      expect(result).toEqual({
        hasErrors: false,
        connectorToken: {
          id: 'per-user:token-id-1',
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
          },
          createdAt,
          expiresAt,
          updatedAt: createdAt,
        },
      });
    });

    test('returns error if credentials are invalid', async () => {
      const createdAt = new Date().toISOString();

      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: 'token-id-1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'user-profile-123',
              connectorId: '123',
              credentialType: 'oauth',
              credentials: {},
              createdAt,
              updatedAt: createdAt,
            },
            score: 1,
            references: [],
          },
        ],
      });

      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        references: [],
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            invalid: 'shape',
          },
          createdAt,
          updatedAt: createdAt,
        },
      });

      const result = await userClient.getOAuthPersonalToken({
        profileUid: 'user-profile-123',
        connectorId: '123',
      });

      expect(result).toEqual({
        hasErrors: true,
        connectorToken: null,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid OAuth credentials shape')
      );
    });
  });

  describe('deleteAllConnectorTokens()', () => {
    const mockOAuthTokensFinder = (savedObjects: unknown[]) => {
      (
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock
      ).mockResolvedValueOnce({
        close: jest.fn(),
        async *find() {
          yield { saved_objects: savedObjects };
        },
      });
    };

    // No saved objects to delete; keeps the deletion half of deleteAllConnectorTokens a no-op.
    const mockEmptyDeletion = () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        per_page: 100,
        page: 1,
        saved_objects: [],
      });
    };

    test('revokes EARS credentials for every user connected to the connector', async () => {
      const createdAt = new Date().toISOString();

      mockOAuthTokensFinder([
        {
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-1',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'access-token-1', refreshToken: 'refresh-token-1' },
            createdAt,
            updatedAt: createdAt,
          },
        },
        {
          id: 'token-id-2',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-2',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'access-token-2' },
            createdAt,
            updatedAt: createdAt,
          },
        },
      ]);
      mockEmptyDeletion();

      await userClient.deleteAllConnectorTokens({
        connectorId: '123',
        authType: 'ears',
        provider: 'test-provider',
      });

      expect(mockRevokeEarsCredentials).toHaveBeenCalledTimes(2);
      expect(mockRevokeEarsCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'test-provider',
          credentials: { accessToken: 'access-token-1', refreshToken: 'refresh-token-1' },
        })
      );
      expect(mockRevokeEarsCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'test-provider',
          credentials: { accessToken: 'access-token-2' },
        })
      );
      expect(
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_connector_token',
          filter:
            'user_connector_token.attributes.connectorId: "123" AND user_connector_token.attributes.credentialType: "oauth"',
        })
      );
    });

    test('skips records with invalid credentials shape and logs the error', async () => {
      const createdAt = new Date().toISOString();

      mockOAuthTokensFinder([
        {
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-1',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: 'not-an-object',
            createdAt,
            updatedAt: createdAt,
          },
        },
      ]);
      mockEmptyDeletion();

      await userClient.deleteAllConnectorTokens({
        connectorId: '123',
        authType: 'ears',
        provider: 'test-provider',
      });

      expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid OAuth credentials shape')
      );
    });

    test('logs individual revocation failures and still revokes the remaining tokens', async () => {
      const createdAt = new Date().toISOString();

      mockOAuthTokensFinder([
        {
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-1',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'access-token-1' },
            createdAt,
            updatedAt: createdAt,
          },
        },
        {
          id: 'token-id-2',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-2',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'access-token-2' },
            createdAt,
            updatedAt: createdAt,
          },
        },
      ]);
      mockEmptyDeletion();

      mockRevokeEarsCredentials
        .mockRejectedValueOnce(new Error('provider timeout'))
        .mockResolvedValueOnce(undefined);

      await userClient.deleteAllConnectorTokens({
        connectorId: '123',
        authType: 'ears',
        provider: 'test-provider',
      });

      expect(mockRevokeEarsCredentials).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('user-profile-1'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('provider timeout'));
      // second user was still attempted
      expect(mockRevokeEarsCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ credentials: { accessToken: 'access-token-2' } })
      );
    });

    test('logs when the finder throws but still completes deletion', async () => {
      (
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock
      ).mockResolvedValueOnce({
        close: jest.fn(),
        async *find() {
          throw new Error('find failed');
        },
      });
      mockEmptyDeletion();

      await userClient.deleteAllConnectorTokens({
        connectorId: '123',
        authType: 'ears',
        provider: 'test-provider',
      });

      expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch/decrypt'));
    });

    test('skipRevocation: true deletes all local tokens without calling revokeEarsCredentials', async () => {
      unsecuredSavedObjectsClient.find
        .mockResolvedValueOnce({
          total: 2,
          per_page: 100,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              references: [],
              attributes: {} as UserConnectorToken,
              score: 1,
            },
            {
              id: 'token-id-2',
              type: 'user_connector_token',
              references: [],
              attributes: {} as UserConnectorToken,
              score: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          total: 0,
          per_page: 100,
          page: 1,
          saved_objects: [],
        });

      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'token-id-1', type: 'user_connector_token', success: true },
          { id: 'token-id-2', type: 'user_connector_token', success: true },
        ],
      });

      await userClient.deleteAllConnectorTokens({
        connectorId: '123',
        authType: 'ears',
        provider: 'test-provider',
        skipRevocation: true,
      });

      expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
      expect(
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser
      ).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: 'user_connector_token', id: 'token-id-1' },
        { type: 'user_connector_token', id: 'token-id-2' },
      ]);
      expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('createWithRefreshToken()', () => {
    test('creates per-user token with refresh token', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'mock-saved-object-id',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'Bearer testtokenvalue',
            refreshToken: 'testrefreshtoken',
          },
          expiresAt,
          createdAt: '2021-01-01T12:00:00.000Z',
          updatedAt: '2021-01-01T12:00:00.000Z',
        },
        references: [],
      });

      const result = await userClient.createWithRefreshToken({
        profileUid: 'user-profile-123',
        connectorId: '123',
        accessToken: 'Bearer testtokenvalue',
        refreshToken: 'testrefreshtoken',
        expiresIn: 3600,
      });

      expect(result).toMatchObject({
        id: 'per-user:mock-saved-object-id',
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
        credentials: {
          accessToken: 'Bearer testtokenvalue',
          refreshToken: 'testrefreshtoken',
        },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'user_connector_token',
        expect.objectContaining({
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentials: {
            accessToken: 'Bearer testtokenvalue',
            refreshToken: 'testrefreshtoken',
          },
        }),
        { id: 'mock-saved-object-id' }
      );
    });
  });

  describe('update()', () => {
    test('updates per-user token with per-user: prefix in id', async () => {
      const expiresAt = new Date().toISOString();

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'oldtoken',
            refreshToken: 'oldrefresh',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        references: [],
      });

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'newtoken',
          },
          expiresAt,
          createdAt: new Date().toISOString(),
          updatedAt: '2021-01-01T12:00:00.000Z',
        },
        references: [],
      });

      const result = await userClient.update({
        id: 'per-user:token-id-1',
        token: 'newtoken',
        expiresAtMillis: expiresAt,
      });

      expect(result).toMatchObject({
        id: 'per-user:token-id-1',
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentials: {
          accessToken: 'newtoken',
        },
      });

      expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
        'user_connector_token',
        'token-id-1'
      );
    });

    test('throws error when given shared: prefix', async () => {
      await expect(
        userClient.update({
          id: 'shared:token-id-1',
          token: 'newtoken',
        })
      ).rejects.toThrow(
        'UserConnectorTokenClient cannot handle shared-scope tokens. Use SharedConnectorTokenClient or ConnectorTokenClient instead.'
      );
    });
  });

  describe('updateWithRefreshToken()', () => {
    test('updates per-user token with new refresh token', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'oldtoken',
            refreshToken: 'oldrefresh',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        references: [],
      });

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'token-id-1',
        type: 'user_connector_token',
        attributes: {
          profileUid: 'user-profile-123',
          connectorId: '123',
          credentialType: 'oauth',
          credentials: {
            accessToken: 'newtoken',
            refreshToken: 'newrefresh',
          },
          expiresAt,
          createdAt: new Date().toISOString(),
          updatedAt: '2021-01-01T12:00:00.000Z',
        },
        references: [],
      });

      const result = await userClient.updateWithRefreshToken({
        id: 'per-user:token-id-1',
        token: 'newtoken',
        refreshToken: 'newrefresh',
        expiresIn: 3600,
      });

      expect(result).toMatchObject({
        id: 'per-user:token-id-1',
        credentials: {
          accessToken: 'newtoken',
          refreshToken: 'newrefresh',
        },
      });
    });

    test('throws error when given shared: prefix', async () => {
      await expect(
        userClient.updateWithRefreshToken({
          id: 'shared:token-id-1',
          token: 'newtoken',
        })
      ).rejects.toThrow(
        'UserConnectorTokenClient cannot handle shared-scope tokens. Use SharedConnectorTokenClient or ConnectorTokenClient instead.'
      );
    });
  });

  describe('deleteConnectorTokens()', () => {
    test('deletes per-user tokens for profileUid and connectorId', async () => {
      unsecuredSavedObjectsClient.delete.mockResolvedValue({});

      const findResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: 'token1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'user-profile-123',
              connectorId: '123',
              credentialType: 'oauth',
              credentials: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            score: 1,
            references: [],
          },
        ],
      };

      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(findResult);
      await userClient.deleteConnectorTokens({
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
      });

      expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
        'user_connector_token',
        'token1'
      );
      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_connector_token',
          filter: expect.stringContaining('profileUid: "user-profile-123"'),
        })
      );
    });

    test('deletes all user tokens for connectorId via deleteAllConnectorTokens', async () => {
      unsecuredSavedObjectsClient.find
        .mockResolvedValueOnce({
          total: 2,
          per_page: 100,
          page: 1,
          saved_objects: [
            {
              id: 'token-user-a',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-a',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
            {
              id: 'token-user-b',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-b',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        })
        .mockResolvedValueOnce({
          total: 0,
          per_page: 100,
          page: 1,
          saved_objects: [],
        });

      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'token-user-a', type: 'user_connector_token', success: true },
          { id: 'token-user-b', type: 'user_connector_token', success: true },
        ],
      });

      await userClient.deleteAllConnectorTokens({ connectorId: '123' });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_connector_token',
          filter: expect.not.stringContaining('profileUid'),
          perPage: 100,
          page: 1,
        })
      );
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: 'user_connector_token', id: 'token-user-a' },
        { type: 'user_connector_token', id: 'token-user-b' },
      ]);
      expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();
    });

    describe('EARS revocation (destructor semantics: revoke whenever a token is deleted)', () => {
      const mockActionAttributes = (
        secrets: { authType?: string; provider?: string },
        config: { authType?: string } = {}
      ) =>
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: '123',
          type: 'action',
          references: [],
          attributes: { config, secrets },
        });
      const mockActionSecrets = (secrets: { authType?: string; provider?: string }) =>
        mockActionAttributes(secrets);

      test('revokes the access and refresh token for a single user before deleting', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        mockActionSecrets({ authType: 'ears', provider: 'google' });
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-profile-123',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        });
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-123',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: {
              accessToken: 'Bearer access-token-1',
              refreshToken: 'refresh-token-1',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        await userClient.deleteConnectorTokens({
          profileUid: 'user-profile-123',
          connectorId: '123',
        });

        expect(mockRevokeEarsCredentials).toHaveBeenCalledWith({
          provider: 'google',
          credentials: { accessToken: 'Bearer access-token-1', refreshToken: 'refresh-token-1' },
          configurationUtilities,
          logger,
        });
        expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
          'user_connector_token',
          'token-id-1'
        );
      });

      test('revokes tokens for every connected user when profileUid is omitted (connector deletion)', async () => {
        mockActionSecrets({ authType: 'ears', provider: 'google' });
        (
          encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock
        ).mockResolvedValueOnce({
          close: jest.fn(),
          async *find() {
            yield {
              saved_objects: [
                {
                  id: 'token-user-a',
                  type: 'user_connector_token',
                  references: [],
                  attributes: {
                    profileUid: 'user-a',
                    connectorId: '123',
                    credentialType: 'oauth',
                    credentials: { accessToken: 'Bearer token-a' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
                {
                  id: 'token-user-b',
                  type: 'user_connector_token',
                  references: [],
                  attributes: {
                    profileUid: 'user-b',
                    connectorId: '123',
                    credentialType: 'oauth',
                    credentials: { accessToken: 'Bearer token-b' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
              ],
            };
          },
        });
        unsecuredSavedObjectsClient.find
          .mockResolvedValueOnce({
            total: 2,
            per_page: 100,
            page: 1,
            saved_objects: [
              {
                id: 'token-user-a',
                type: 'user_connector_token',
                attributes: {
                  profileUid: 'user-a',
                  connectorId: '123',
                  credentialType: 'oauth',
                  credentials: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                score: 1,
                references: [],
              },
              {
                id: 'token-user-b',
                type: 'user_connector_token',
                attributes: {
                  profileUid: 'user-b',
                  connectorId: '123',
                  credentialType: 'oauth',
                  credentials: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                score: 1,
                references: [],
              },
            ],
          })
          .mockResolvedValueOnce({
            total: 0,
            per_page: 100,
            page: 1,
            saved_objects: [],
          });
        unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
          statuses: [
            { id: 'token-user-a', type: 'user_connector_token', success: true },
            { id: 'token-user-b', type: 'user_connector_token', success: true },
          ],
        });

        await userClient.deleteAllConnectorTokens({ connectorId: '123' });

        expect(mockRevokeEarsCredentials).toHaveBeenCalledWith({
          provider: 'google',
          credentials: { accessToken: 'Bearer token-a' },
          configurationUtilities,
          logger,
        });
        expect(mockRevokeEarsCredentials).toHaveBeenCalledWith({
          provider: 'google',
          credentials: { accessToken: 'Bearer token-b' },
          configurationUtilities,
          logger,
        });
        expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
          { type: 'user_connector_token', id: 'token-user-a' },
          { type: 'user_connector_token', id: 'token-user-b' },
        ]);
        expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();
      });

      test('does not attempt to revoke for non-EARS auth types, but still deletes', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        mockActionSecrets({ authType: 'oauth_authorization_code' });
        unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
          total: 0,
          per_page: 10,
          page: 1,
          saved_objects: [],
        });

        await userClient.deleteConnectorTokens({
          profileUid: 'user-profile-123',
          connectorId: '123',
        });

        expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('No revoke endpoint available')
        );
      });

      test('falls back to config.authType when secrets.authType is absent', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        mockActionAttributes({ provider: 'google' }, { authType: 'ears' });
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-profile-123',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        });
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-123',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'Bearer access-token-1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        await userClient.deleteConnectorTokens({
          profileUid: 'user-profile-123',
          connectorId: '123',
        });

        expect(mockRevokeEarsCredentials).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'google' })
        );
      });

      test('still deletes local tokens when the connector auth lookup fails', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValueOnce(
          new Error('decrypt failed')
        );
        unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
          total: 0,
          per_page: 10,
          page: 1,
          saved_objects: [],
        });

        await expect(
          userClient.deleteConnectorTokens({ profileUid: 'user-profile-123', connectorId: '123' })
        ).resolves.toBeUndefined();

        expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
      });

      test('throws when SO deletion fails after successful revocation', async () => {
        mockActionSecrets({ authType: 'ears', provider: 'google' });
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-123',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'Bearer access-token-1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-profile-123',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        });
        unsecuredSavedObjectsClient.delete.mockRejectedValueOnce(new Error('SO delete failed'));

        await expect(
          userClient.deleteConnectorTokens({ profileUid: 'user-profile-123', connectorId: '123' })
        ).rejects.toThrow('SO delete failed');

        expect(mockRevokeEarsCredentials).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to delete user_connector_token records')
        );
      });

      test('still deletes local tokens when the revoke call itself fails', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        mockActionSecrets({ authType: 'ears', provider: 'google' });
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-profile-123',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        });
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: 'token-id-1',
          type: 'user_connector_token',
          references: [],
          attributes: {
            profileUid: 'user-profile-123',
            connectorId: '123',
            credentialType: 'oauth',
            credentials: { accessToken: 'Bearer access-token-1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        mockRevokeEarsCredentials.mockRejectedValueOnce(new Error('revoke failed'));

        await userClient.deleteConnectorTokens({
          profileUid: 'user-profile-123',
          connectorId: '123',
        });

        expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
          'user_connector_token',
          'token-id-1'
        );
      });

      test('skipRevocation: true deletes the local token without calling revokeEarsCredentials', async () => {
        unsecuredSavedObjectsClient.delete.mockResolvedValue({});
        unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: 'token-id-1',
              type: 'user_connector_token',
              attributes: {
                profileUid: 'user-profile-123',
                connectorId: '123',
                credentialType: 'oauth',
                credentials: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              score: 1,
              references: [],
            },
          ],
        });

        await userClient.deleteConnectorTokens({
          profileUid: 'user-profile-123',
          connectorId: '123',
          authType: 'ears',
          provider: 'google',
          skipRevocation: true,
        });

        expect(mockRevokeEarsCredentials).not.toHaveBeenCalled();
        expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
          'user_connector_token',
          'token-id-1'
        );
      });
    });
  });

  describe('updateOrReplace()', () => {
    test('throws when existing token has no id', async () => {
      const tokenWithoutId = {
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
        credentials: { accessToken: 'old' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(
        userClient.updateOrReplace({
          profileUid: 'user-profile-123',
          connectorId: '123',
          token: tokenWithoutId as UserConnectorToken,
          newToken: 'newtoken',
          tokenRequestDate: Date.now(),
          deleteExisting: false,
        })
      ).rejects.toThrow('token id is missing');
    });

    test('throws when existing token has empty string id', async () => {
      const tokenWithEmptyId = {
        id: '',
        profileUid: 'user-profile-123',
        connectorId: '123',
        credentialType: 'oauth',
        credentials: { accessToken: 'old' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(
        userClient.updateOrReplace({
          profileUid: 'user-profile-123',
          connectorId: '123',
          token: tokenWithEmptyId as UserConnectorToken,
          newToken: 'newtoken',
          tokenRequestDate: Date.now(),
          deleteExisting: false,
        })
      ).rejects.toThrow('token id is missing');
    });
  });
});
