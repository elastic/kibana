/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { ServiceAccountCredentialAttributes } from './credential_saved_object';
import { getCredentialId, SERVICE_ACCOUNT_CREDENTIAL_TYPE } from './credential_saved_object';
import { ServiceAccountCredentialStore } from './credential_store';

const SERVICE_ACCOUNT_ID = 'kibana/nightshift-relay';

const attributes = (
  overrides: Partial<ServiceAccountCredentialAttributes> = {}
): ServiceAccountCredentialAttributes => ({
  serviceAccountId: SERVICE_ACCOUNT_ID,
  namespace: 'kibana',
  name: 'nightshift-relay',
  tokenName: 'kibana-managed',
  createdAt: '2026-09-14T00:00:00.000Z',
  createdBy: { type: 'user', username: 'elastic', userProfileId: 'profile-uid' },
  token: 'AAEAAWtpYmFuYS9uaWdodHNoaWZ0',
  ...overrides,
});

describe('ServiceAccountCredentialStore', () => {
  let client: ReturnType<typeof savedObjectsClientMock.create>;
  let encryptedClient: ReturnType<typeof encryptedSavedObjectsMock.createClient>;
  let isEncryptionError: jest.Mock<boolean, [Error]>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let store: ServiceAccountCredentialStore;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
    encryptedClient = encryptedSavedObjectsMock.createClient();
    isEncryptionError = jest.fn().mockReturnValue(false);
    logger = loggingSystemMock.createLogger();
    store = new ServiceAccountCredentialStore({
      client,
      encryptedClient,
      isEncryptionError,
      logger,
    });
  });

  describe('credential IDs', () => {
    it('are stable for an account and unique across accounts', () => {
      expect(getCredentialId(SERVICE_ACCOUNT_ID)).toBe(getCredentialId(SERVICE_ACCOUNT_ID));
      expect(getCredentialId('kibana/other')).not.toBe(getCredentialId(SERVICE_ACCOUNT_ID));
    });

    it('cannot be made to collide by smuggling the separator into a name', () => {
      // A naive `namespace + '/' + name` join would make these two indistinguishable.
      expect(getCredentialId('kibana/a/b')).not.toBe(getCredentialId('kibana/a')?.concat('b'));
      expect(getCredentialId('kibana/a/b')).not.toBe(getCredentialId('kibana/ab'));
    });
  });

  describe('#set', () => {
    it('writes the whole document under the derived ID', async () => {
      await store.set(attributes());

      expect(client.create).toHaveBeenCalledWith(SERVICE_ACCOUNT_CREDENTIAL_TYPE, attributes(), {
        id: getCredentialId(SERVICE_ACCOUNT_ID),
        overwrite: true,
        refresh: 'wait_for',
      });
    });
  });

  describe('#delete', () => {
    it('resolves true when the credential was removed', async () => {
      await expect(store.delete(SERVICE_ACCOUNT_ID)).resolves.toBe(true);
      expect(client.delete).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_CREDENTIAL_TYPE,
        getCredentialId(SERVICE_ACCOUNT_ID),
        { refresh: 'wait_for' }
      );
    });

    it('resolves false when there was nothing to remove', async () => {
      client.delete.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SERVICE_ACCOUNT_CREDENTIAL_TYPE, 'id')
      );

      await expect(store.delete(SERVICE_ACCOUNT_ID)).resolves.toBe(false);
    });

    it('rethrows anything else', async () => {
      client.delete.mockRejectedValue(new Error('cluster unreachable'));

      await expect(store.delete(SERVICE_ACCOUNT_ID)).rejects.toThrow('cluster unreachable');
    });
  });

  describe('#getMetadata', () => {
    const OTHER_ACCOUNT_ID = 'kibana/other';

    it('reads the plain documents without the token and keys them by service account id', async () => {
      client.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
            id: getCredentialId(SERVICE_ACCOUNT_ID),
            references: [],
            attributes: {
              createdAt: '2026-09-14T00:00:00.000Z',
              createdBy: { type: 'user', username: 'elastic' },
            },
          },
          {
            type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
            id: getCredentialId(OTHER_ACCOUNT_ID),
            references: [],
            attributes: {
              createdAt: '2026-09-15T00:00:00.000Z',
              createdBy: { type: 'api_key', apiKeyId: 'key-id', variant: 'stack' },
            },
          },
        ],
      });

      const metadata = await store.getMetadata([SERVICE_ACCOUNT_ID, OTHER_ACCOUNT_ID]);

      expect(client.bulkGet).toHaveBeenCalledWith([
        {
          type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
          id: getCredentialId(SERVICE_ACCOUNT_ID),
          fields: ['createdAt', 'createdBy'],
        },
        {
          type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
          id: getCredentialId(OTHER_ACCOUNT_ID),
          fields: ['createdAt', 'createdBy'],
        },
      ]);
      expect(encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect([...metadata.entries()]).toEqual([
        [
          SERVICE_ACCOUNT_ID,
          {
            createdAt: '2026-09-14T00:00:00.000Z',
            createdBy: { type: 'user', username: 'elastic' },
          },
        ],
        [
          OTHER_ACCOUNT_ID,
          {
            createdAt: '2026-09-15T00:00:00.000Z',
            createdBy: { type: 'api_key', apiKeyId: 'key-id', variant: 'stack' },
          },
        ],
      ]);
    });

    it('leaves out accounts that have no credential', async () => {
      client.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
            id: getCredentialId(SERVICE_ACCOUNT_ID),
            error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          },
          {
            type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
            id: getCredentialId(OTHER_ACCOUNT_ID),
            references: [],
            attributes: {
              createdAt: '2026-09-15T00:00:00.000Z',
              createdBy: { type: 'user', username: 'elastic' },
            },
          },
        ],
      });

      const metadata = await store.getMetadata([SERVICE_ACCOUNT_ID, OTHER_ACCOUNT_ID]);

      expect(metadata.has(SERVICE_ACCOUNT_ID)).toBe(false);
      expect(metadata.has(OTHER_ACCOUNT_ID)).toBe(true);
    });

    it('does not touch the client for an empty page', async () => {
      await expect(store.getMetadata([])).resolves.toEqual(new Map());

      expect(client.bulkGet).not.toHaveBeenCalled();
    });

    it('rejects when a document fails to read for any other reason', async () => {
      client.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
            id: getCredentialId(SERVICE_ACCOUNT_ID),
            error: { statusCode: 500, error: 'Internal Server Error', message: 'shard failure' },
          },
        ],
      });

      await expect(store.getMetadata([SERVICE_ACCOUNT_ID])).rejects.toThrow(
        /credential metadata of service account \[kibana\/nightshift-relay\].*shard failure/
      );
    });
  });

  describe('#getDecrypted', () => {
    it('returns the decrypted attributes', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getCredentialId(SERVICE_ACCOUNT_ID),
        type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
        references: [],
        attributes: attributes(),
      });

      await expect(store.getDecrypted(SERVICE_ACCOUNT_ID)).resolves.toEqual(attributes());
      expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_CREDENTIAL_TYPE,
        getCredentialId(SERVICE_ACCOUNT_ID)
      );
    });

    it('resolves null when the account has no credential', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SERVICE_ACCOUNT_CREDENTIAL_TYPE, 'id')
      );

      await expect(store.getDecrypted(SERVICE_ACCOUNT_ID)).resolves.toBeNull();
    });

    it('refuses with a 403 when the document fails integrity verification', async () => {
      // A document edited directly in the index: every attribute is authenticated, so decryption
      // fails and the credential must never be used.
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(new Error('unable to decrypt'));
      isEncryptionError.mockReturnValue(true);

      await expect(store.getDecrypted(SERVICE_ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed integrity verification')
      );
    });

    // Decryption skips an absent encrypted attribute instead of failing, so this document comes
    // back reporting success with none of its other attributes having been authenticated.
    it.each([{ token: undefined }, { token: '' }])(
      'refuses with a 403 when the stored token is missing (%j)',
      async (overrides) => {
        encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
          id: getCredentialId(SERVICE_ACCOUNT_ID),
          type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
          references: [],
          attributes: attributes(overrides),
        });

        await expect(store.getDecrypted(SERVICE_ACCOUNT_ID)).rejects.toMatchObject({
          output: { statusCode: 403 },
        });
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('failed integrity verification: the token is missing')
        );
      }
    );

    it('rethrows anything else', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('cluster unreachable')
      );

      await expect(store.getDecrypted(SERVICE_ACCOUNT_ID)).rejects.toThrow('cluster unreachable');
    });
  });
});
