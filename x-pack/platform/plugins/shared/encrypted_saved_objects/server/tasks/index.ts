/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';

import { encryptedSavedObjectsBridge } from './bridge';
import { ConfigSchema } from '../config';
import { EncryptedSavedObjectsService, EncryptionError } from '../crypto';
import type { EncryptedSavedObjectTypeRegistration } from '../crypto';
import { createCryptos } from '../crypto/create_cryptos';
import { setupSavedObjects } from '../saved_objects';
import type { ClientInstanciator } from '../saved_objects';

export interface EncryptedSavedObjectsTasksSetup {
  canEncrypt: boolean;
  registerType: (registration: EncryptedSavedObjectTypeRegistration) => void;
}

export interface EncryptedSavedObjectsTasksStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
}

/**
 * Encrypted saved objects for task runtimes: the same service, client and encryption extension as
 * the plugin, so tasks decrypt without calling Kibana. The runtime needs the same
 * `xpack.encryptedSavedObjects.encryptionKey` (and `keyRotation.decryptionOnlyKeys`) as Kibana in
 * its config, and one that has it can decrypt any encrypted saved object. Only what tasks use is
 * available (registering types, the client, `isEncryptionError`); migrations and model versions
 * are created by Kibana.
 */
class EncryptedSavedObjectsTasksPlugin
  implements TasksPlugin<EncryptedSavedObjectsTasksSetup, EncryptedSavedObjectsTasksStart>
{
  private getClient?: ClientInstanciator;

  constructor(
    private readonly context: PluginInitializerContext<ReturnType<typeof ConfigSchema.validate>>
  ) {}

  setup(core: CoreTasksSetup): EncryptedSavedObjectsTasksSetup {
    const real = encryptedSavedObjectsBridge.getSetup();
    if (real) return real;

    const logger = this.context.logger.get();
    const config = this.context.config.get();
    const canEncrypt = config.encryptionKey !== undefined;
    if (!canEncrypt) {
      logger.warn(
        'xpack.encryptedSavedObjects.encryptionKey is not set: decrypting saved objects will fail'
      );
    }
    const service = new EncryptedSavedObjectsService({ ...createCryptos(config), logger });
    this.getClient = setupSavedObjects({
      service,
      savedObjects: core.savedObjects as never,
      getStartServices: core.getStartServices as never,
      logger,
    });
    return {
      canEncrypt,
      registerType: (registration) => service.registerType(registration),
    };
  }

  start(): EncryptedSavedObjectsTasksStart {
    const real = encryptedSavedObjectsBridge.getStart();
    if (real) return real;

    return {
      isEncryptionError: (error) => error instanceof EncryptionError,
      getClient: this.getClient!,
    };
  }
}

export const plugin = async (context: PluginInitializerContext<any>) =>
  new EncryptedSavedObjectsTasksPlugin(context);

export const config: PluginConfigDescriptor = { schema: ConfigSchema };
