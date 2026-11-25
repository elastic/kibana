/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecretConflictError, SecretNotFoundError, SecretValidationError } from '@kbn/secrets';
import type { SecretMetadata } from '@kbn/secrets';
import type { SecretsStorage, StoredSecret } from './storage';
import type { SecretEntry, SecretsClient } from './types';
import { validateSecret } from './validate_secret';

export interface CreateSecretsClientParams {
  /** The secrets of one space. */
  readonly storage: SecretsStorage;
  /** Id of the feature using the client. */
  readonly consumer: string;
  /** Recorded as the author of created and updated secrets. */
  readonly username: string;
}

const withoutValue = ({ value, ...metadata }: SecretEntry): SecretMetadata => metadata;

/** An empty description means no description. */
const toStoredDescription = (description: string | undefined): string | undefined =>
  description === '' ? undefined : description;

/** Creates the secrets client of one space for one consumer feature. */
export const createSecretsClient = ({
  storage,
  consumer,
  username,
}: CreateSecretsClientParams): SecretsClient => {
  /** Returns the secret stored under this name, if this consumer may use it. */
  const find = async (name: string): Promise<StoredSecret | undefined> => {
    const stored = await storage.get({ name });
    return stored?.entry.allowedConsumers.includes(consumer) ? stored : undefined;
  };

  const findOrThrow = async (name: string): Promise<StoredSecret> => {
    const stored = await find(name);
    if (!stored) {
      throw new SecretNotFoundError(name);
    }
    return stored;
  };

  return {
    list: async () => storage.list({ consumer }),

    create: async (secret) => {
      validateSecret(secret);
      const { name, description, source } = secret;
      const timestamp = new Date().toISOString();
      const entry: SecretEntry = {
        name,
        description: toStoredDescription(description),
        allowedConsumers: [consumer],
        createdBy: username,
        createdAt: timestamp,
        updatedBy: username,
        updatedAt: timestamp,
        ...source,
      };
      await storage.create({ entry });
      return withoutValue(entry);
    },

    update: async (secret) => {
      const { name, description, source } = secret;
      if (source === undefined && description === undefined) {
        throw new SecretValidationError('Updating a secret needs a source or a description');
      }
      validateSecret(secret);
      const { entry: existing, version } = await findOrThrow(name);
      const { allowedConsumers, createdBy, createdAt } = existing;
      const details = {
        name,
        allowedConsumers,
        createdBy,
        createdAt,
        // Without a description the current one stays: changing a value must not require
        // sending the description again.
        description:
          description === undefined ? existing.description : toStoredDescription(description),
        updatedBy: username,
        updatedAt: new Date().toISOString(),
      };
      // A new source replaces every field of the current one. Without one the current source
      // stays: changing a description must not require sending the value again.
      const entry: SecretEntry = source ? { ...details, ...source } : { ...existing, ...details };
      try {
        await storage.replace({ entry, version });
      } catch (error) {
        // A secret deleted meanwhile is reported as missing, not as a conflict.
        if (error instanceof SecretConflictError && !(await find(name))) {
          throw new SecretNotFoundError(name);
        }
        throw error;
      }
      return withoutValue(entry);
    },

    delete: async ({ name }) => {
      await findOrThrow(name);
      await storage.delete({ name });
    },
  };
};
