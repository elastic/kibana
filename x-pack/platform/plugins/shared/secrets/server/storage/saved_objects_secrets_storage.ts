/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SECRET_PROVIDER_TYPE, SecretAlreadyExistsError, SecretNotFoundError } from '@kbn/secrets';
import type { SecretEntry, SecretMetadata, SecretsStorage } from '@kbn/secrets';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';
import type {
  ListedSecretAttributes,
  SecretAttributes,
} from '../saved_objects/secret_saved_object';

// One page is enough for a proof of concept. A larger space needs paging.
const LIST_PER_PAGE = 1000;

export interface CreateSavedObjectsSecretsStorageParams {
  readonly spaceId: string;
  /** Must include the hidden secret type and must not apply the spaces extension. */
  readonly savedObjectsClient: Pick<SavedObjectsClientContract, 'create' | 'find' | 'delete'>;
  readonly encryptedClient: Pick<EncryptedSavedObjectsClient, 'getDecryptedAsInternalUser'>;
}

const toEntry = (attributes: SecretAttributes): SecretEntry => {
  // The type promises a value, but a read does not verify it. Never return a missing value.
  if (attributes.provider === SECRET_PROVIDER_TYPE.kibana && typeof attributes.value !== 'string') {
    throw new Error(`Secret "${attributes.name}" has no value`);
  }
  return attributes;
};

/** Creates the storage that keeps the secrets of one space as encrypted saved objects. */
export const createSavedObjectsSecretsStorage = ({
  spaceId,
  savedObjectsClient,
  encryptedClient,
}: CreateSavedObjectsSecretsStorageParams): SecretsStorage => {
  const namespace = SavedObjectsUtils.namespaceStringToId(spaceId);
  const idOf = (name: string): string => getSecretSavedObjectId({ spaceId, name });

  const write = async ({
    entry,
    overwrite,
  }: {
    entry: SecretEntry;
    overwrite: boolean;
  }): Promise<void> => {
    await savedObjectsClient.create<SecretEntry>(SECRET_SAVED_OBJECT_TYPE, entry, {
      id: idOf(entry.name),
      namespace,
      overwrite,
    });
  };

  return {
    list: async () => {
      const { saved_objects: found } = await savedObjectsClient.find<ListedSecretAttributes>({
        type: SECRET_SAVED_OBJECT_TYPE,
        namespaces: [spaceId],
        perPage: LIST_PER_PAGE,
      });
      return found.map(({ attributes }): SecretMetadata => attributes);
    },

    get: async ({ name }) => {
      try {
        const { attributes } = await encryptedClient.getDecryptedAsInternalUser<SecretAttributes>(
          SECRET_SAVED_OBJECT_TYPE,
          idOf(name),
          { namespace }
        );
        return toEntry(attributes);
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    },

    create: async ({ entry }) => {
      try {
        await write({ entry, overwrite: false });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isConflictError(error)) {
          throw new SecretAlreadyExistsError(entry.name);
        }
        throw error;
      }
    },

    // A full overwrite encrypts the value again. A partial update would corrupt it.
    replace: async ({ entry }) => write({ entry, overwrite: true }),

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
