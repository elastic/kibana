/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SharedConnectorTokenClient } from './shared_connector_token_client';
import type { Logger } from '@kbn/core/server';
import type { ConnectorToken } from '../types';

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

let sharedClient: SharedConnectorTokenClient;
let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
});
beforeEach(() => {
  clock.reset();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  sharedClient = new SharedConnectorTokenClient({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
  });
});
afterAll(() => clock.restore());

describe('SharedConnectorTokenClient', () => {
  describe('create()', () => {
    test('creates connector_token with all given properties', async () => {
      const expiresAt = new Date().toISOString();
      const savedObjectCreateResult = {
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          expiresAt,
        },
        references: [],
      };

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
      const result = await sharedClient.create({
        connectorId: '123',
        expiresAtMillis: expiresAt,
        token: 'testtokenvalue',
      });
      expect(result).toEqual({
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      });
      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
        'testtokenvalue'
      );
    });
  });

  describe('get()', () => {
    test('retrieves and decrypts connector_token', async () => {
      const expiresAt = new Date().toISOString();
      const createdAt = new Date().toISOString();
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'connector_token',
            attributes: {
              connectorId: '123',
              tokenType: 'access_token',
              createdAt,
              expiresAt,
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        references: [],
        attributes: {
          token: 'testtokenvalue',
        },
      });
      const result = await sharedClient.get({
        connectorId: '123',
        tokenType: 'access_token',
      });
      expect(result).toEqual({
        hasErrors: false,
        connectorToken: {
          id: '1',
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt,
          expiresAt,
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

      const result = await sharedClient.get({
        connectorId: '123',
        tokenType: 'access_token',
      });
      expect(result).toEqual({ connectorToken: null, hasErrors: false });
    });
  });

  describe('update()', () => {
    test('updates connector token', async () => {
      const expiresAt = new Date().toISOString();

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt: new Date().toISOString(),
        },
        references: [],
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          expiresAt,
        },
        references: [],
      });

      const result = await sharedClient.update({
        id: '1',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAtMillis: expiresAt,
      });
      expect(result).toEqual({
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      });
    });
  });

  describe('deleteConnectorTokens()', () => {
    test('deletes all tokens for connector', async () => {
      const expectedResult = Symbol();
      unsecuredSavedObjectsClient.delete.mockResolvedValue(expectedResult);

      const findResult = {
        total: 2,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: 'token1',
            type: 'connector_token',
            attributes: {
              connectorId: '1',
              tokenType: 'access_token',
              createdAt: new Date().toISOString(),
              expiresAt: new Date().toISOString(),
            },
            score: 1,
            references: [],
          },
          {
            id: 'token2',
            type: 'connector_token',
            attributes: {
              connectorId: '1',
              tokenType: 'refresh_token',
              createdAt: new Date().toISOString(),
              expiresAt: new Date().toISOString(),
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(findResult);
      const result = await sharedClient.deleteConnectorTokens({ connectorId: '1' });
      expect(JSON.stringify(result)).toEqual(JSON.stringify([Symbol(), Symbol()]));
      expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('createWithRefreshToken()', () => {
    test('creates token with refresh token', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'Bearer testtokenvalue',
          refreshToken: 'testrefreshtoken',
          expiresAt,
        },
        references: [],
      });

      const result = await sharedClient.createWithRefreshToken({
        connectorId: '123',
        accessToken: 'Bearer testtokenvalue',
        refreshToken: 'testrefreshtoken',
        expiresIn: 3600,
      });

      expect(result).toMatchObject({
        connectorId: '123',
        token: 'Bearer testtokenvalue',
        refreshToken: 'testrefreshtoken',
      });
    });
  });

  describe('updateWithRefreshToken()', () => {
    test('updates token with refresh token', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'oldtoken',
          refreshToken: 'oldrefresh',
          createdAt: new Date().toISOString(),
        },
        references: [],
      });

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'connector_token',
        attributes: {
          connectorId: '123',
          tokenType: 'access_token',
          token: 'newtoken',
          refreshToken: 'newrefresh',
          expiresAt,
        },
        references: [],
      });

      const result = await sharedClient.updateWithRefreshToken({
        id: '1',
        token: 'newtoken',
        refreshToken: 'newrefresh',
        expiresIn: 3600,
      });

      expect(result).toMatchObject({
        connectorId: '123',
        token: 'newtoken',
        refreshToken: 'newrefresh',
      });
    });
  });
});
