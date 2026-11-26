/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES_EXTENSION_ID } from '@kbn/core/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  createKibanaSecretProvider,
  createSecretsClient,
  SecretsUnavailableError,
} from '@kbn/secrets';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createAuditedSecretsClient } from './audit/audited_secrets_client';
import {
  getSecretSavedObjectId,
  registerSecretType,
  SECRET_SAVED_OBJECT_TYPE,
} from './saved_objects/secret_saved_object';
import { createSavedObjectsSecretsStorage } from './storage/saved_objects_secrets_storage';
import type {
  SecretProviderRegistration,
  SecretsPluginSetup,
  SecretsPluginSetupDependencies,
  SecretsPluginStart,
  SecretsPluginStartDependencies,
} from './types';

const includedHiddenTypes = [SECRET_SAVED_OBJECT_TYPE];
const UNKNOWN_USERNAME = 'unknown';

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
  private connectorProviderRegistration?: SecretProviderRegistration;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { savedObjects }: CoreSetup<SecretsPluginStartDependencies, SecretsPluginStart>,
    { encryptedSavedObjects }: SecretsPluginSetupDependencies
  ): SecretsPluginSetup {
    this.canEncrypt = encryptedSavedObjects.canEncrypt;
    if (!this.canEncrypt) {
      this.logger.warn('Secrets are unavailable: Kibana has no saved objects encryption key.');
    }
    registerSecretType({ savedObjects, encryptedSavedObjects });
    return {
      registerProvider: (registration) => {
        if (this.connectorProviderRegistration) {
          throw new Error(`A provider of "${registration.type}" secrets is already registered.`);
        }
        this.connectorProviderRegistration = registration;
      },
    };
  }

  public start(
    core: CoreStart,
    { encryptedSavedObjects, spaces }: SecretsPluginStartDependencies
  ): SecretsPluginStart {
    // Every call passes its namespace. Callers include task runs, whose request has no
    // credentials for the space check that the spaces extension makes.
    const savedObjectsClient = core.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes,
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    const encryptedClient = encryptedSavedObjects.getClient({ includedHiddenTypes });
    const kibanaSecretProvider = createKibanaSecretProvider();

    return {
      getClient: ({ request, consumer }) => {
        if (!this.canEncrypt) {
          throw new SecretsUnavailableError(
            'Secrets need a saved objects encryption key (xpack.encryptedSavedObjects.encryptionKey).'
          );
        }
        const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        const client = createSecretsClient({
          storage: createSavedObjectsSecretsStorage({
            spaceId,
            savedObjectsClient,
            encryptedClient,
          }),
          consumer,
          username: core.security.authc.getCurrentUser(request)?.username ?? UNKNOWN_USERNAME,
          providers: {
            kibana: kibanaSecretProvider,
            // Absent when no plugin registered one: secrets then only come from Kibana.
            connector: this.connectorProviderRegistration?.create({
              request,
              spaceId,
              getSecretSavedObject: ({ name }) => ({
                type: SECRET_SAVED_OBJECT_TYPE,
                id: getSecretSavedObjectId({ spaceId, name }),
              }),
            }),
          },
        });
        return createAuditedSecretsClient({
          client,
          auditLogger: core.security.audit.asScoped(request),
          consumer,
          spaceId,
        });
      },
    };
  }

  public stop(): void {}
}
