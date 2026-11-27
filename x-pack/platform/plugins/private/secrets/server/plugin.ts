/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createSecretsClient } from './client/secrets_client';
import { createUnavailableSecretsClient } from './client/unavailable_secrets_client';
import { registerSecretType } from './saved_objects/secret_saved_object';
import { createSecretsStorageFactory } from './storage/saved_objects_secrets_storage';
import type {
  SecretsPluginSetup,
  SecretsPluginSetupDependencies,
  SecretsPluginStart,
  SecretsPluginStartDependencies,
} from './types';

const NO_ENCRYPTION_KEY_REASON =
  'Secrets are unavailable: set xpack.encryptedSavedObjects.encryptionKey in kibana.yml to store them encrypted.';

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

    const getStorage = createSecretsStorageFactory({ savedObjects, encryptedSavedObjects });

    return {
      getClient: ({ request }) =>
        createSecretsClient({
          storage: getStorage({ spaceId: request.spaceId }),
          profileId: security.authc.getCurrentUser(request)?.profile_uid ?? null,
        }),
    };
  }

  public stop(): void {}
}
