/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { OAuthStateClient } from './oauth_state_client';
import { OAUTH_STATE_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

jest.mock('@kbn/core/server', () => {
  const actual = jest.requireActual('@kbn/core/server');
  return {
    ...actual,
    SavedObjectsUtils: {
      ...actual.SavedObjectsUtils,
      generateId: jest.fn().mockReturnValue('generated-id'),
    },
  };
});

const mockLogger = loggingSystemMock.create().get();

const mockUnsecuredSavedObjectsClient = {
  create: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
  createPointInTimeFinder: jest.fn(),
  bulkDelete: jest.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getDecryptedAsInternalUser: jest.fn(),
};

const createClient = () =>
  new OAuthStateClient({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptedSavedObjectsClient: mockEncryptedSavedObjectsClient as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unsecuredSavedObjectsClient: mockUnsecuredSavedObjectsClient as any,
    logger: mockLogger,
  });

describe('OAuthStateClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (SavedObjectsUtils.generateId as jest.Mock).mockReturnValue('generated-id');
  });

  describe('create', () => {
    it('creates OAuth state with PKCE parameters', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.create.mockResolvedValue({
        id: 'generated-id',
        attributes: {
          state: 'mock-state',
          codeVerifier: 'mock-verifier',
          connectorId: 'connector-1',
          redirectUri: 'https://kibana.example.com/callback',
          kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
          spaceId: 'default',
          createdAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2025-01-01T00:10:00.000Z',
        },
      });

      const result = await client.create({
        connectorId: 'connector-1',
        redirectUri: 'https://kibana.example.com/callback',
        kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
        spaceId: 'default',
      });

      expect(result.state).toEqual(
        expect.objectContaining({
          id: 'generated-id',
          connectorId: 'connector-1',
          redirectUri: 'https://kibana.example.com/callback',
          kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
          spaceId: 'default',
        })
      );
      expect(result.codeChallenge).toEqual(expect.any(String));
      expect(result.codeChallenge.length).toBeGreaterThan(0);

      expect(mockUnsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          state: expect.any(String),
          codeVerifier: expect.any(String),
          connectorId: 'connector-1',
          redirectUri: 'https://kibana.example.com/callback',
          kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
          spaceId: 'default',
          createdAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
        { id: 'generated-id' }
      );
    });

    it('omits createdBy when undefined', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.create.mockResolvedValue({
        id: 'generated-id',
        attributes: {},
      });

      await client.create({
        connectorId: 'connector-1',
        redirectUri: 'https://kibana.example.com/callback',
        kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
        spaceId: 'default',
      });

      const createdAttributes = mockUnsecuredSavedObjectsClient.create.mock.calls[0][1];
      expect(createdAttributes).not.toHaveProperty('createdBy');
    });

    it('includes createdBy when provided', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.create.mockResolvedValue({
        id: 'generated-id',
        attributes: {},
      });

      await client.create({
        connectorId: 'connector-1',
        redirectUri: 'https://kibana.example.com/callback',
        kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
        spaceId: 'default',
        createdBy: 'testuser',
      });

      const createdAttributes = mockUnsecuredSavedObjectsClient.create.mock.calls[0][1];
      expect(createdAttributes.createdBy).toBe('testuser');
    });

    it('sets expiration to 10 minutes from now', async () => {
      const client = createClient();
      const now = new Date('2025-06-01T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      mockUnsecuredSavedObjectsClient.create.mockResolvedValue({
        id: 'generated-id',
        attributes: {},
      });

      await client.create({
        connectorId: 'connector-1',
        redirectUri: 'https://kibana.example.com/callback',
        kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
        spaceId: 'default',
      });

      const createdAttributes = mockUnsecuredSavedObjectsClient.create.mock.calls[0][1];
      expect(createdAttributes.createdAt).toBe('2025-06-01T12:00:00.000Z');
      expect(createdAttributes.expiresAt).toBe('2025-06-01T12:10:00.000Z');

      jest.useRealTimers();
    });

    it('throws and logs error on creation failure', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.create.mockRejectedValue(new Error('SO create failed'));

      await expect(
        client.create({
          connectorId: 'connector-1',
          redirectUri: 'https://kibana.example.com/callback',
          kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
          spaceId: 'default',
        })
      ).rejects.toThrow('SO create failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create OAuth state for connectorId "connector-1"')
      );
    });
  });

  describe('get', () => {
    it('returns decrypted OAuth state when found and not expired', async () => {
      const client = createClient();
      const futureDate = new Date(Date.now() + 60000).toISOString();

      mockUnsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'state-id-1',
            attributes: {
              state: 'test-state',
              expiresAt: futureDate,
            },
          },
        ],
      });
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          state: 'test-state',
          codeVerifier: 'decrypted-verifier',
          connectorId: 'connector-1',
          redirectUri: 'https://kibana.example.com/callback',
          kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
          spaceId: 'default',
          createdAt: '2025-01-01T00:00:00.000Z',
          expiresAt: futureDate,
        },
      });

      const result = await client.get('test-state');

      expect(result).toEqual({
        id: 'state-id-1',
        state: 'test-state',
        codeVerifier: 'decrypted-verifier',
        connectorId: 'connector-1',
        redirectUri: 'https://kibana.example.com/callback',
        kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
        spaceId: 'default',
        createdAt: '2025-01-01T00:00:00.000Z',
        expiresAt: futureDate,
      });

      expect(mockUnsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        type: OAUTH_STATE_SAVED_OBJECT_TYPE,
        filter: `${OAUTH_STATE_SAVED_OBJECT_TYPE}.attributes.state: "test-state"`,
        perPage: 1,
      });
      expect(mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        'state-id-1'
      );
    });

    it('returns null when state is not found', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
      });

      const result = await client.get('nonexistent-state');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('OAuth state not found for state parameter: nonexistent-state')
      );
    });

    it('returns null and deletes when state is expired', async () => {
      const client = createClient();
      const pastDate = new Date(Date.now() - 60000).toISOString();

      mockUnsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'expired-state-id',
            attributes: {
              state: 'expired-state',
              expiresAt: pastDate,
            },
          },
        ],
      });

      const result = await client.get('expired-state');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('OAuth state expired for state parameter: expired-state')
      );
      expect(mockUnsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        'expired-state-id'
      );
    });

    it('returns null and logs error on failure', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.find.mockRejectedValue(new Error('find failed'));

      const result = await client.get('some-state');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch OAuth state for state parameter "some-state"')
      );
    });
  });

  describe('delete', () => {
    it('deletes the OAuth state saved object', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.delete.mockResolvedValue({});

      await client.delete('state-id-1');

      expect(mockUnsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        'state-id-1'
      );
    });

    it('throws and logs error on deletion failure', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.delete.mockRejectedValue(new Error('delete failed'));

      await expect(client.delete('state-id-1')).rejects.toThrow('delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete OAuth state "state-id-1"')
      );
    });
  });

  describe('cleanupExpiredStates', () => {
    it('deletes expired states and returns count', async () => {
      const client = createClient();

      const mockFinder = {
        find: jest.fn().mockImplementation(async function* () {
          yield {
            saved_objects: [
              { id: 'expired-1', type: OAUTH_STATE_SAVED_OBJECT_TYPE },
              { id: 'expired-2', type: OAUTH_STATE_SAVED_OBJECT_TYPE },
            ],
          };
        }),
        close: jest.fn(),
      };
      mockUnsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue(mockFinder);
      mockUnsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({});

      const result = await client.cleanupExpiredStates();

      expect(result).toBe(2);
      expect(mockUnsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: OAUTH_STATE_SAVED_OBJECT_TYPE, id: 'expired-1' },
        { type: OAUTH_STATE_SAVED_OBJECT_TYPE, id: 'expired-2' },
      ]);
      expect(mockFinder.close).toHaveBeenCalled();
    });

    it('returns 0 and logs error on failure', async () => {
      const client = createClient();
      mockUnsecuredSavedObjectsClient.createPointInTimeFinder.mockImplementation(() => {
        throw new Error('finder failed');
      });

      const result = await client.cleanupExpiredStates();

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup expired OAuth states')
      );
    });

    it('handles multiple pages of expired states', async () => {
      const client = createClient();

      const mockFinder = {
        find: jest.fn().mockImplementation(async function* () {
          yield {
            saved_objects: [{ id: 'expired-1', type: OAUTH_STATE_SAVED_OBJECT_TYPE }],
          };
          yield {
            saved_objects: [
              { id: 'expired-2', type: OAUTH_STATE_SAVED_OBJECT_TYPE },
              { id: 'expired-3', type: OAUTH_STATE_SAVED_OBJECT_TYPE },
            ],
          };
        }),
        close: jest.fn(),
      };
      mockUnsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue(mockFinder);
      mockUnsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({});

      const result = await client.cleanupExpiredStates();

      expect(result).toBe(3);
      expect(mockUnsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(2);
    });
  });
});
