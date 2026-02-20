/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { UserConnectorTokenClient } from './user_connector_token_client';
import type { Logger } from '@kbn/core/server';
import type { UserConnectorToken } from '../types';

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

let userClient: UserConnectorTokenClient;
let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
});
beforeEach(() => {
  clock.reset();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  userClient = new UserConnectorTokenClient({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
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
