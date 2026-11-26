/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecretConflictError, SecretNotFoundError, SecretValidationError } from '@kbn/secrets';
import type { SecretMetadata, UpdateSecretParams } from '@kbn/secrets';
import type { SecretsStorage, StoredSecret } from './storage';
import type { SecretEntry, SecretsClient } from './types';
import { validateSecret } from './validate_secret';

export interface CreateSecretsClientParams {
  /** The secrets of one space. */
  readonly storage: SecretsStorage;
  /** User profile id recorded as the author of created and updated secrets. `null` without one. */
  readonly profileId: string | null;
}

const withoutValue = ({ value, ...metadata }: SecretEntry): SecretMetadata => metadata;

/** An empty description means no description. */
const toStoredDescription = (description: string | undefined): string | undefined =>
  description === '' ? undefined : description;

/** Creates the secrets client of one space. */
export const createSecretsClient = ({
  storage,
  profileId,
}: CreateSecretsClientParams): SecretsClient => {
  const findOrThrow = async (name: string): Promise<StoredSecret> => {
    const stored = await storage.get({ name });
    if (!stored) {
      throw new SecretNotFoundError(name);
    }
    return stored;
  };

  // Replacing the value does not read the current one, which may no longer decrypt.
  const readForUpdate = async ({ name, value }: UpdateSecretParams): Promise<StoredSecret> => {
    if (value === undefined) {
      return findOrThrow(name);
    }
    const stored = await storage.getMetadata({ name });
    if (!stored) {
      throw new SecretNotFoundError(name);
    }
    return { entry: { ...stored.metadata, value }, version: stored.version };
  };

  return {
    list: async () => storage.list(),

    create: async (secret) => {
      validateSecret(secret);
      const { name, description, value } = secret;
      const timestamp = new Date().toISOString();
      const entry: SecretEntry = {
        name,
        description: toStoredDescription(description),
        value,
        createdBy: profileId,
        createdAt: timestamp,
        updatedBy: profileId,
        updatedAt: timestamp,
      };
      await storage.create({ entry });
      return withoutValue(entry);
    },

    update: async (secret) => {
      const { name, description, value } = secret;
      if (value === undefined && description === undefined) {
        throw new SecretValidationError('Updating a secret needs a value or a description');
      }
      validateSecret(secret);
      const { entry: existing, version } = await readForUpdate(secret);
      // An omitted value or description keeps the current one: changing one must not require
      // sending the other again.
      const entry: SecretEntry = {
        ...existing,
        value: value ?? existing.value,
        description:
          description === undefined ? existing.description : toStoredDescription(description),
        updatedBy: profileId,
        updatedAt: new Date().toISOString(),
      };
      try {
        await storage.replace({ entry, version });
      } catch (error) {
        // A secret deleted meanwhile is reported as missing, not as a conflict.
        if (error instanceof SecretConflictError && !(await storage.getMetadata({ name }))) {
          throw new SecretNotFoundError(name);
        }
        throw error;
      }
      return withoutValue(entry);
    },

    delete: async ({ name }) => storage.delete({ name }),
  };
};
