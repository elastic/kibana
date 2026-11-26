/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { ConnectorSecretProvider, SECRET_PROVIDER_TYPE, SecretsClient } from '@kbn/secrets';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface GetSecretsClientParams {
  readonly request: KibanaRequest;
  /** Id of the feature asking, checked against each secret's allowed consumers. */
  readonly consumer: string;
}

/** What a registered provider gets to serve one secrets client. */
export interface CreateSecretProviderParams {
  /** The request of the caller of the secrets client. */
  readonly request: KibanaRequest;
  readonly spaceId: string;
  /** The saved object that stores a secret, for a provider that reports what it acts for. */
  getSecretSavedObject(params: { name: string }): { type: string; id: string };
}

/**
 * A provider of secrets whose values live outside Kibana. The plugin that can reach them
 * registers it, so that the secrets plugin depends on none of them.
 */
export interface SecretProviderRegistration {
  readonly type: typeof SECRET_PROVIDER_TYPE.connector;
  /** Creates the provider for one secrets client. Called for each client, after start. */
  create(params: CreateSecretProviderParams): ConnectorSecretProvider;
}

/** Setup contract of the secrets plugin. Dependants also use its presence to know it is enabled. */
export interface SecretsPluginSetup {
  /** Registers a provider of secrets. Throws when its type already has one. */
  registerProvider(registration: SecretProviderRegistration): void;
}

export interface SecretsPluginStart {
  /**
   * Returns the secrets client for the space of the request and for one consumer feature.
   * It makes no permission check: the consumer owns the permissions and checks them first.
   * Throws `SecretsUnavailableError` when Kibana has no encryption key.
   */
  getClient(params: GetSecretsClientParams): SecretsClient;
}

export interface SecretsPluginSetupDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface SecretsPluginStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  spaces?: SpacesPluginStart;
}
