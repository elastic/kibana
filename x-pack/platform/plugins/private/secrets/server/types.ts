/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecretsClient } from './client/types';

export interface GetSecretsClientParams {
  /** Gives the space of the secrets and the user recorded as their author. */
  readonly request: KibanaRequest;
}

/**
 * Setup contract of the secrets plugin. It has no members: dependants use its presence to know,
 * at setup, that the plugin is enabled.
 */
export type SecretsPluginSetup = Record<string, never>;

export interface SecretsPluginStart {
  /**
   * Returns the secrets client for the space of the request. It makes no permission check: the
   * consumer owns the permissions and checks them first. When Kibana has no encryption key, every
   * operation of the client throws `SecretsUnavailableError`.
   */
  getClient(params: GetSecretsClientParams): SecretsClient;
}

export interface SecretsPluginSetupDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface SecretsPluginStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}
