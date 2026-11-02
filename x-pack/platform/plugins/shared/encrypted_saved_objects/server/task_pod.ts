/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePodPlugin, podContract } from '@kbn/task-manager-plugin/server/task_pod';

import { ConfigSchema } from './config';
import { EncryptedSavedObjectsService, EncryptionError } from './crypto';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import { createCryptos } from './crypto/create_cryptos';
import { setupSavedObjects } from './saved_objects';
import type { ClientInstanciator } from './saved_objects';

// The client `setup` builds, read by `start` (one pod plugin's setup and start share it).
const clients = new Map<symbol, ClientInstanciator>();

/**
 * Encrypted saved objects in a task pod: the same service, client and encryption extension as the
 * plugin, run in the pod so its tasks decrypt without calling Kibana. The pod needs the same
 * `xpack.encryptedSavedObjects.encryptionKey` (and `keyRotation.decryptionOnlyKeys`) as Kibana in
 * its config, and a pod that has it can decrypt any encrypted saved object. Only what tasks use is
 * available (registering types, the client, `isEncryptionError`); migrations and model versions are
 * created by Kibana.
 */
export const podPlugins = [
  definePodPlugin({
    id: 'encryptedSavedObjects',
    configPath: ['xpack', 'encryptedSavedObjects'],
    configSchema: ConfigSchema,
    setup: (core, _plugins, context) => {
      const logger = context.logger.get() as never;
      const config = context.config.get<ReturnType<typeof ConfigSchema.validate>>();
      const canEncrypt = config.encryptionKey !== undefined;
      if (!canEncrypt) {
        (logger as { warn: (message: string) => void }).warn(
          'xpack.encryptedSavedObjects.encryptionKey is not set in the pod config: decrypting saved objects will fail'
        );
      }
      const service = new EncryptedSavedObjectsService({ ...createCryptos(config), logger });
      const getClient: ClientInstanciator = setupSavedObjects({
        service,
        savedObjects: core.savedObjects,
        getStartServices: core.getStartServices,
        logger,
      });
      clients.set(context.opaqueId, getClient);
      return podContract('encryptedSavedObjects', {
        canEncrypt,
        registerType: (registration: EncryptedSavedObjectTypeRegistration) =>
          service.registerType(registration),
      });
    },
    start: (_core, _plugins, context) =>
      podContract('encryptedSavedObjects', {
        isEncryptionError: (error: Error) => error instanceof EncryptionError,
        getClient: clients.get(context.opaqueId)!,
      }),
  }),
];
