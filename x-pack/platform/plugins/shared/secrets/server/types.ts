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
import type { GetSecretsClientParams, SecretsClient } from '@kbn/secrets';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

/**
 * Setup contract of the secrets plugin. It has no members yet: dependants use its presence
 * to know, at setup, that the plugin is enabled.
 */
export type SecretsPluginSetup = Record<string, never>;

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
