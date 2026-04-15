/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';
import { createHash } from 'crypto';

import type {
  CoreSetup,
  ISavedObjectTypeRegistry,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';

import type { ConfigType } from './config';
import {
  type CreateEncryptedSavedObjectsMigrationFn,
  getCreateMigration,
} from './create_migration';
import { type CreateEsoModelVersionFn, getCreateEsoModelVersion } from './create_model_version';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import {
  EncryptedSavedObjectsService,
  EncryptionError,
  EncryptionKeyRotationService,
} from './crypto';
import { defineRoutes } from './routes';
import type { ClientInstanciator } from './saved_objects';
import { SavedObjectsEncryptionExtension, setupSavedObjects } from './saved_objects';

export interface PluginsSetup {
  security?: SecurityPluginSetup;
}

export interface EncryptedSavedObjectsPluginSetup {
  /**
   * Indicates if Saved Object encryption is possible. Requires an encryption key to be explicitly set via `xpack.encryptedSavedObjects.encryptionKey`.
   */
  canEncrypt: boolean;
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  createMigration: CreateEncryptedSavedObjectsMigrationFn;
  createModelVersion: CreateEsoModelVersionFn;
}

export interface EncryptedSavedObjectsPluginStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
  /**
   * This function is exposed for Core migration testing purposes only.
   */
  __testCreateDangerousExtension: (
    typeRegistry: ISavedObjectTypeRegistry,
    typeRegistrationOverrides?: EncryptedSavedObjectTypeRegistration[]
  ) => SavedObjectsEncryptionExtension;
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class EncryptedSavedObjectsPlugin
  implements
    Plugin<EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart, PluginsSetup>
{
  private readonly logger: Logger;
  private savedObjectsSetup!: ClientInstanciator;
  #service?: Readonly<EncryptedSavedObjectsService>;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, _deps: PluginsSetup): EncryptedSavedObjectsPluginSetup {
    const config = this.initializerContext.config.get<ConfigType>();
    const canEncrypt = config.encryptionKey !== undefined;
    if (!canEncrypt) {
      this.logger.warn(
        'Saved objects encryption key is not set. This will severely limit Kibana functionality. ' +
          'Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    } else {
      const hashedEncryptionKey = createHash('sha3-256')
        .update(config.encryptionKey)
        .digest('base64');

      this.logger.info(
        `Hashed 'xpack.encryptedSavedObjects.encryptionKey' for this instance: ${hashedEncryptionKey}`
      );
    }

    const readOnlyKeys = config.keyRotation?.decryptionOnlyKeys;

    if (readOnlyKeys !== undefined && readOnlyKeys.length > 0) {
      const readOnlyKeyHashses = readOnlyKeys.map((readOnlyKey, i) =>
        createHash('sha3-256').update(readOnlyKey).digest('base64')
      );

      this.logger.info(
        `Hashed 'xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys' for this instance: ${readOnlyKeyHashses}`
      );
    }

    const primaryCrypto = config.encryptionKey
      ? nodeCrypto({ encryptionKey: config.encryptionKey })
      : undefined;
    const decryptionOnlyCryptos = config.keyRotation.decryptionOnlyKeys.map((decryptionKey) =>
      nodeCrypto({ encryptionKey: decryptionKey })
    );

    this.#service = Object.freeze(
      new EncryptedSavedObjectsService({
        primaryCrypto,
        decryptionOnlyCryptos,
        logger: this.logger,
      })
    );

    this.savedObjectsSetup = setupSavedObjects({
      service: this.#service,
      savedObjects: core.savedObjects,
      getStartServices: core.getStartServices,
      logger: this.logger,
    });

    // Expose the key rotation route for both stateful and serverless environments
    // The endpoint requires admin privileges, and is internal only in serverless
    defineRoutes({
      router: core.http.createRouter(),
      logger: this.initializerContext.logger.get('routes'),
      encryptionKeyRotationService: Object.freeze(
        new EncryptionKeyRotationService({
          logger: this.logger.get('key-rotation-service'),
          service: this.#service,
          getStartServices: core.getStartServices,
        })
      ),
      config,
      buildFlavor: this.initializerContext.env.packageInfo.buildFlavor,
    });

    return {
      canEncrypt,
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => {
        this.#service?.registerType(typeRegistration);
      },
      createMigration: getCreateMigration(
        this.#service,
        (typeRegistration: EncryptedSavedObjectTypeRegistration) => {
          const serviceForMigration = new EncryptedSavedObjectsService({
            primaryCrypto,
            decryptionOnlyCryptos,
            logger: this.logger,
          });
          serviceForMigration.registerType(typeRegistration);
          return serviceForMigration;
        }
      ),
      createModelVersion: getCreateEsoModelVersion(
        this.#service,
        (typeRegistration: EncryptedSavedObjectTypeRegistration) => {
          const serviceForMigration = new EncryptedSavedObjectsService({
            primaryCrypto,
            decryptionOnlyCryptos,
            logger: this.logger,
          });
          serviceForMigration.registerType(typeRegistration);
          return serviceForMigration;
        }
      ),
    };
  }

  public start() {
    this.logger.debug('Starting plugin');
    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      getClient: (options = {}) => this.savedObjectsSetup(options),
      __testCreateDangerousExtension: (
        typeRegistry: ISavedObjectTypeRegistry,
        typeRegistrationOverrides?: EncryptedSavedObjectTypeRegistration[]
      ): SavedObjectsEncryptionExtension => {
        if (!this.#service) {
          throw new Error('EncryptedSavedObjectsPlugin setup has not been called');
        }
        return new SavedObjectsEncryptionExtension({
          baseTypeRegistry: typeRegistry,
          service: this.#service.__dangerousClone(typeRegistrationOverrides),
          getCurrentUser: async () => undefined,
        });
      },
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
