/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECRET_PROVIDER_TYPE } from './constants';
import { SecretNotFoundError, SecretsUnavailableError } from './errors';
import type { SecretsStorage } from './storage';
import type {
  SecretEntry,
  SecretMetadata,
  SecretProviders,
  SecretResolutionFailure,
  SecretsClient,
} from './types';
import { validateSecret } from './validate_secret';

export interface CreateSecretsClientParams {
  /** The secrets of one space. */
  readonly storage: SecretsStorage;
  /** Id of the feature using the client. */
  readonly consumer: string;
  /** Recorded as the author of created and replaced secrets. */
  readonly username: string;
  /** How to obtain a value, for each place a value can live. */
  readonly providers: SecretProviders;
}

const withoutValue = (entry: SecretEntry): SecretMetadata => {
  if (entry.provider === SECRET_PROVIDER_TYPE.kibana) {
    const { value, ...metadata } = entry;
    return metadata;
  }
  return entry;
};

/** Creates the secrets client of one space for one consumer feature. */
export const createSecretsClient = ({
  storage,
  consumer,
  username,
  providers,
}: CreateSecretsClientParams): SecretsClient => {
  const connectorSecretsAvailable = providers.connector !== undefined;

  const isUsable = (secret: SecretMetadata): boolean => secret.allowedConsumers.includes(consumer);

  /** Returns the secret stored under exactly this name, if this consumer may use it. */
  const find = async (name: string): Promise<SecretEntry | undefined> => {
    const entry = await storage.get({ name });
    // Storage matches names regardless of case. A reference must use the exact name.
    return entry && entry.name === name && isUsable(entry) ? entry : undefined;
  };

  const findOrThrow = async (name: string): Promise<SecretEntry> => {
    const entry = await find(name);
    if (!entry) {
      throw new SecretNotFoundError(name);
    }
    return entry;
  };

  const getValue = async (entry: SecretEntry): Promise<string> => {
    if (entry.provider === SECRET_PROVIDER_TYPE.kibana) {
      return providers.kibana.resolve({ entry });
    }
    if (!providers.connector) {
      throw new SecretsUnavailableError('Secrets from a connector are not available');
    }
    return providers.connector.resolve({ entry });
  };

  return {
    list: async () => (await storage.list()).filter(isUsable),

    create: async (secret) => {
      validateSecret({ secret, connectorSecretsAvailable });
      const { name, description, source } = secret;
      const timestamp = new Date().toISOString();
      const entry: SecretEntry = {
        name,
        description,
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

    replace: async (secret) => {
      validateSecret({ secret, connectorSecretsAvailable });
      const { name, description, source } = secret;
      const { allowedConsumers, createdBy, createdAt } = await findOrThrow(name);
      const entry: SecretEntry = {
        name,
        description,
        allowedConsumers,
        createdBy,
        createdAt,
        updatedBy: username,
        updatedAt: new Date().toISOString(),
        ...source,
      };
      await storage.replace({ entry });
      return withoutValue(entry);
    },

    delete: async ({ name }) => {
      await findOrThrow(name);
      await storage.delete({ name });
    },

    resolve: async ({ names }) => {
      const values = new Map<string, string>();
      const missing: string[] = [];
      const failed: SecretResolutionFailure[] = [];

      const resolveOne = async (name: string): Promise<void> => {
        try {
          const entry = await find(name);
          if (entry) {
            values.set(name, await getValue(entry));
          } else {
            missing.push(name);
          }
        } catch (error) {
          failed.push({ name, message: error instanceof Error ? error.message : String(error) });
        }
      };

      await Promise.all([...new Set(names)].map(resolveOne));
      return { values, missing, failed };
    },
  };
};
