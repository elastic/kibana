/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_SECRETS_SO_ID, NIGHTSHIFT_SECRETS_SO_TYPE } from '../saved_objects';
import { createSandboxSecretsClient } from './sandbox_secrets_client';
import {
  SandboxSecretsConflictError,
  SandboxSecretsUnavailableError,
  SandboxSecretsValidationError,
} from './errors';

const setup = ({
  canEncrypt = true,
  storedValues,
  spaceId = 'default',
}: {
  canEncrypt?: boolean;
  storedValues?: Record<string, string>;
  spaceId?: string;
} = {}) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const soClient = savedObjectsClientMock.create();
  soClient.asScopedToNamespace.mockReturnValue(soClient);
  savedObjects.getScopedClient.mockReturnValue(soClient);

  const getDecryptedAsInternalUser = jest.fn(async () => {
    if (!storedValues) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        NIGHTSHIFT_SECRETS_SO_ID
      );
    }
    return { attributes: { keys: Object.keys(storedValues), values: storedValues } };
  });
  const encryptedSavedObjects = {
    getClient: jest.fn(() => ({ getDecryptedAsInternalUser })),
    isEncryptionError: jest.fn(() => false),
  } as unknown as jest.Mocked<EncryptedSavedObjectsPluginStart>;

  const spaces = {
    spacesService: { getSpaceId: jest.fn(() => spaceId) },
  } as unknown as SpacesPluginStart;

  const client = createSandboxSecretsClient({
    getDeps: () => ({ savedObjects, encryptedSavedObjects, spaces }),
    canEncrypt,
    logger: loggingSystemMock.createLogger(),
  });

  return {
    client,
    soClient,
    savedObjects,
    getDecryptedAsInternalUser,
    encryptedSavedObjects,
    request: httpServerMock.createKibanaRequest(),
  };
};

describe('createSandboxSecretsClient', () => {
  describe('listKeys', () => {
    it('returns stored keys and version without decrypting', async () => {
      const { client, soClient, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value' },
      });
      soClient.get.mockResolvedValue({
        id: NIGHTSHIFT_SECRETS_SO_ID,
        type: NIGHTSHIFT_SECRETS_SO_TYPE,
        references: [],
        version: 'v1',
        attributes: { keys: ['A_KEY'] },
      });

      await expect(client.listKeys(request)).resolves.toEqual({
        keys: ['A_KEY'],
        version: 'v1',
        canEncrypt: true,
      });
      expect(getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('returns an empty list when nothing is stored', async () => {
      const { client, soClient, request } = setup();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(NIGHTSHIFT_SECRETS_SO_TYPE)
      );

      await expect(client.listKeys(request)).resolves.toEqual({ keys: [], canEncrypt: true });
    });

    it('scopes the saved objects client to the request space', async () => {
      const { client, soClient, savedObjects, request } = setup({ spaceId: 'team-a' });
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(NIGHTSHIFT_SECRETS_SO_TYPE)
      );

      await client.listKeys(request);

      expect(savedObjects.getScopedClient).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ includedHiddenTypes: [NIGHTSHIFT_SECRETS_SO_TYPE] })
      );
      expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('team-a');
    });
  });

  describe('replaceEntries', () => {
    it('keeps stored values for entries without a value, overwrites and deletes the rest', async () => {
      const { client, soClient, request } = setup({
        storedValues: { KEEP: 'kept-value', REPLACE: 'old-value', DROP: 'dropped-value' },
      });
      soClient.create.mockResolvedValue({
        id: NIGHTSHIFT_SECRETS_SO_ID,
        type: NIGHTSHIFT_SECRETS_SO_TYPE,
        references: [],
        version: 'v2',
        attributes: {},
      });

      const result = await client.replaceEntries(request, {
        entries: [
          { key: 'KEEP' },
          { key: 'REPLACE', value: 'new-value' },
          { key: 'ADD', value: 'x' },
        ],
        version: 'v1',
      });

      expect(result).toEqual({ keys: ['KEEP', 'REPLACE', 'ADD'], version: 'v2' });
      expect(soClient.create).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        {
          keys: ['KEEP', 'REPLACE', 'ADD'],
          values: { KEEP: 'kept-value', REPLACE: 'new-value', ADD: 'x' },
        },
        { id: NIGHTSHIFT_SECRETS_SO_ID, overwrite: true, version: 'v1' }
      );
      expect(JSON.stringify(result)).not.toContain('value');
    });

    it('requires a value for keys that have none stored', async () => {
      const { client, soClient, request } = setup({ storedValues: { OLD_NAME: 'secret' } });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'NEW_NAME' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it.each([['PATH'], ['CONNECTOR_TOKEN'], ['lower_case'], ['1STARTS_WITH_DIGIT'], ['']])(
      'rejects the invalid key %p',
      async (key) => {
        const { client, request } = setup({ storedValues: {} });

        await expect(
          client.replaceEntries(request, { entries: [{ key, value: 'v' }] })
        ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
      }
    );

    it('rejects duplicate keys', async () => {
      const { client, request } = setup({ storedValues: {} });

      await expect(
        client.replaceEntries(request, {
          entries: [
            { key: 'DUP', value: 'a' },
            { key: 'DUP', value: 'b' },
          ],
        })
      ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
    });

    it('fails when encryption is unavailable', async () => {
      const { client, request } = setup({ canEncrypt: false, storedValues: {} });

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'v' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsUnavailableError);
    });

    it('maps saved object version conflicts to a conflict error', async () => {
      const { client, soClient, request } = setup({ storedValues: {} });
      soClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(
          NIGHTSHIFT_SECRETS_SO_TYPE,
          NIGHTSHIFT_SECRETS_SO_ID
        )
      );

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY', value: 'v' }], version: 'v0' })
      ).rejects.toBeInstanceOf(SandboxSecretsConflictError);
    });

    it('requires every value to be re-entered when stored values cannot be decrypted', async () => {
      const { client, getDecryptedAsInternalUser, encryptedSavedObjects, request } = setup({
        storedValues: { A_KEY: 'v' },
      });
      getDecryptedAsInternalUser.mockRejectedValue(new Error('Unable to decrypt'));
      encryptedSavedObjects.isEncryptionError.mockReturnValue(true);

      await expect(
        client.replaceEntries(request, { entries: [{ key: 'A_KEY' }] })
      ).rejects.toBeInstanceOf(SandboxSecretsValidationError);
    });
  });

  describe('resolveForCommand', () => {
    it('returns only the requested secrets and marks long values for redaction', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        spaceId: 'team-a',
        storedValues: { GITHUB_TOKEN: 'ghp_long_secret', SHORT: 'abc', OTHER: 'other-value' },
      });

      await expect(client.resolveForCommand(request, ['GITHUB_TOKEN', 'SHORT'])).resolves.toEqual({
        env: { GITHUB_TOKEN: 'ghp_long_secret', SHORT: 'abc' },
        secretValues: ['ghp_long_secret'],
      });
      expect(getDecryptedAsInternalUser).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        NIGHTSHIFT_SECRETS_SO_ID,
        { namespace: 'team-a' }
      );
    });

    it('uses no namespace for the default space', async () => {
      const { client, getDecryptedAsInternalUser, request } = setup({
        storedValues: { A_KEY: 'value-123' },
      });

      await client.resolveForCommand(request, ['A_KEY']);

      expect(getDecryptedAsInternalUser).toHaveBeenCalledWith(
        NIGHTSHIFT_SECRETS_SO_TYPE,
        NIGHTSHIFT_SECRETS_SO_ID,
        { namespace: undefined }
      );
    });

    it('reports unknown keys together with the available ones', async () => {
      const { client, request } = setup({ storedValues: { A_KEY: 'value-123' } });

      const result = await client.resolveForCommand(request, ['MISSING']);

      expect(result).toEqual({
        errorMessage: expect.stringContaining('Unknown sandbox secret(s): MISSING'),
      });
      expect(result).toEqual({ errorMessage: expect.stringContaining('Available secrets: A_KEY') });
      expect(JSON.stringify(result)).not.toContain('value-123');
    });

    it('reports an error when encryption is unavailable', async () => {
      const { client, request } = setup({ canEncrypt: false, storedValues: { A_KEY: 'v' } });

      await expect(client.resolveForCommand(request, ['A_KEY'])).resolves.toEqual({
        errorMessage: expect.stringContaining('Sandbox secrets are unavailable'),
      });
    });
  });
});
