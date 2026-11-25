/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES_EXTENSION_ID } from '@kbn/core/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createSecretsClient } from './client/secrets_client';
import { createUnavailableSecretsClient } from './client/unavailable_secrets_client';
import { registerSecretType, SECRET_SAVED_OBJECT_TYPE } from './saved_objects/secret_saved_object';
import { createSavedObjectsSecretsStorage } from './storage/saved_objects_secrets_storage';
import type {
  SecretsPluginSetup,
  SecretsPluginSetupDependencies,
  SecretsPluginStart,
  SecretsPluginStartDependencies,
} from './types';

const NO_ENCRYPTION_KEY_REASON =
  'Secrets are unavailable: set xpack.encryptedSavedObjects.encryptionKey in kibana.yml to store them encrypted.';

const includedHiddenTypes = [SECRET_SAVED_OBJECT_TYPE];

export class SecretsPlugin
  implements
    Plugin<
      SecretsPluginSetup,
      SecretsPluginStart,
      SecretsPluginSetupDependencies,
      SecretsPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private canEncrypt = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { savedObjects }: CoreSetup,
    { encryptedSavedObjects }: SecretsPluginSetupDependencies
  ): SecretsPluginSetup {
    this.canEncrypt = encryptedSavedObjects.canEncrypt;
    if (!this.canEncrypt) {
      this.logger.warn(NO_ENCRYPTION_KEY_REASON);
    }
    registerSecretType({ savedObjects, encryptedSavedObjects });
    return {};
  }

  public start(
    { savedObjects, security }: CoreStart,
    { encryptedSavedObjects }: SecretsPluginStartDependencies
  ): SecretsPluginStart {
    if (!this.canEncrypt) {
      const unavailableClient = createUnavailableSecretsClient({
        reason: NO_ENCRYPTION_KEY_REASON,
      });
      return { getClient: () => unavailableClient };
    }

    // The storage passes the space of the request on every call. The spaces extension refuses a
    // namespace from the caller, so it is excluded.
    const savedObjectsClient = savedObjects.getUnsafeInternalClient({
      includedHiddenTypes,
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    const encryptedClient = encryptedSavedObjects.getClient({ includedHiddenTypes });

    return {
      getClient: ({ request }) =>
        createSecretsClient({
          storage: createSavedObjectsSecretsStorage({
            spaceId: request.spaceId,
            savedObjectsClient,
            encryptedClient,
          }),
          username: security.authc.getCurrentUser(request)?.username ?? null,
        }),
    };
  }

  public stop(): void {}
}
