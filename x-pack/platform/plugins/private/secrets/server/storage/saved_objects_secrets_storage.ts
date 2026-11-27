/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsUtils, SPACES_EXTENSION_ID } from '@kbn/core/server';
import type { SavedObjectsClientContract, SavedObjectsServiceStart } from '@kbn/core/server';
import {
  EncryptionError,
  EncryptionErrorOperation,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import {
  SecretAlreadyExistsError,
  SecretConflictError,
  SecretNotFoundError,
  SecretUndecryptableError,
} from '@kbn/secrets';
import type { SecretMetadata } from '@kbn/secrets';
import type { SecretsStorage } from '../client/storage';
import type { SecretEntry } from '../client/types';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';
import type {
  ListedSecretAttributes,
  SecretAttributes,
} from '../saved_objects/secret_saved_object';

const LIST_PER_PAGE = 100;

export interface CreateSavedObjectsSecretsStorageParams {
  readonly spaceId: string;
  /** Must include the hidden secret type and must not apply the spaces extension. */
  readonly savedObjectsClient: Pick<
    SavedObjectsClientContract,
    'create' | 'createPointInTimeFinder' | 'delete' | 'get'
  >;
  readonly encryptedClient: Pick<EncryptedSavedObjectsClient, 'getDecryptedAsInternalUser'>;
}

const toEntry = (attributes: SecretAttributes): SecretEntry => {
  // The type promises a value, but a read does not verify it. Never return a missing value.
  if (typeof attributes.value !== 'string') {
    throw new Error(`Secret "${attributes.name}" has no value`);
  }
  return attributes;
};

/** Reads one secret with its version, or `undefined` when no secret has this name. */
const readVersioned = async <T>({
  name,
  read,
}: {
  name: string;
  read: () => Promise<{ attributes: T; version?: string }>;
}): Promise<{ attributes: T; version: string } | undefined> => {
  try {
    const { attributes, version } = await read();
    if (version === undefined) {
      throw new Error(`Secret "${name}" has no version`);
    }
    return { attributes, version };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

/** Creates the storage that keeps the secrets of one space as encrypted saved objects. */
export const createSavedObjectsSecretsStorage = ({
  spaceId,
  savedObjectsClient,
  encryptedClient,
}: CreateSavedObjectsSecretsStorageParams): SecretsStorage => {
  const namespace = SavedObjectsUtils.namespaceStringToId(spaceId);
  const idOf = (name: string): string => getSecretSavedObjectId({ spaceId, name });

  const decrypt = async (name: string) => {
    try {
      return await encryptedClient.getDecryptedAsInternalUser<SecretAttributes>(
        SECRET_SAVED_OBJECT_TYPE,
        idOf(name),
        { namespace }
      );
    } catch (error) {
      if (
        error instanceof EncryptionError &&
        error.operation === EncryptionErrorOperation.Decryption
      ) {
        throw new SecretUndecryptableError(name);
      }
      throw error;
    }
  };

  return {
    list: async () => {
      const finder = savedObjectsClient.createPointInTimeFinder<ListedSecretAttributes>({
        type: SECRET_SAVED_OBJECT_TYPE,
        namespaces: [spaceId],
        perPage: LIST_PER_PAGE,
      });
      const secrets: SecretMetadata[] = [];
      try {
        for await (const { saved_objects: page } of finder.find()) {
          // A read that does not decrypt never returns the encrypted `value`.
          secrets.push(...page.map(({ attributes }) => attributes));
        }
      } finally {
        await finder.close();
      }
      return secrets;
    },

    get: async ({ name }) => {
      const secret = await readVersioned({ name, read: () => decrypt(name) });
      return secret && { entry: toEntry(secret.attributes), version: secret.version };
    },

    getMetadata: async ({ name }) => {
      const secret = await readVersioned({
        name,
        // A read that does not decrypt never returns the encrypted `value`.
        read: () =>
          savedObjectsClient.get<ListedSecretAttributes>(SECRET_SAVED_OBJECT_TYPE, idOf(name), {
            namespace,
          }),
      });
      return secret && { metadata: secret.attributes, version: secret.version };
    },

    create: async ({ entry }) => {
      try {
        await savedObjectsClient.create<SecretEntry>(SECRET_SAVED_OBJECT_TYPE, entry, {
          id: idOf(entry.name),
          namespace,
          overwrite: false,
        });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isConflictError(error)) {
          throw new SecretAlreadyExistsError(entry.name);
        }
        throw error;
      }
    },

    // A full overwrite encrypts the value again: a partial update would corrupt it. The version
    // makes Elasticsearch refuse the write when the secret changed or was deleted since it was
    // read.
    replace: async ({ entry, version }) => {
      try {
        await savedObjectsClient.create<SecretEntry>(SECRET_SAVED_OBJECT_TYPE, entry, {
          id: idOf(entry.name),
          namespace,
          overwrite: true,
          version,
        });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isConflictError(error)) {
          throw new SecretConflictError(entry.name);
        }
        throw error;
      }
    },

    delete: async ({ name }) => {
      try {
        await savedObjectsClient.delete(SECRET_SAVED_OBJECT_TYPE, idOf(name), { namespace });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          throw new SecretNotFoundError(name);
        }
        throw error;
      }
    },
  };
};

export interface CreateSecretsStorageFactoryParams {
  readonly savedObjects: Pick<SavedObjectsServiceStart, 'getUnsafeInternalClient'>;
  readonly encryptedSavedObjects: Pick<EncryptedSavedObjectsPluginStart, 'getClient'>;
}

/** Builds the clients the storage needs once, and returns the storage of a space. */
export const createSecretsStorageFactory = ({
  savedObjects,
  encryptedSavedObjects,
}: CreateSecretsStorageFactoryParams): ((params: { spaceId: string }) => SecretsStorage) => {
  const includedHiddenTypes = [SECRET_SAVED_OBJECT_TYPE];
  // The storage passes the space of the request on every call. The spaces extension refuses a
  // namespace from the caller, so it is excluded.
  const savedObjectsClient = savedObjects.getUnsafeInternalClient({
    includedHiddenTypes,
    excludedExtensions: [SPACES_EXTENSION_ID],
  });
  const encryptedClient = encryptedSavedObjects.getClient({ includedHiddenTypes });
  return ({ spaceId }) =>
    createSavedObjectsSecretsStorage({ spaceId, savedObjectsClient, encryptedClient });
};
