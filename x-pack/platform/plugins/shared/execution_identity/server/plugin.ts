/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/types';
import {
  ExecutionIdentitySavedObjectType,
  ExecutionIdentityEncryptionParams,
} from './saved_objects/execution_identity_type';
import { ExecutionIdentityService } from './service';
import { registerRoutes } from './routes';

interface SetupDeps {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

interface StartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface ExecutionIdentityPluginStart {
  resolveIdentity: (id: string) => Promise<{ apiKey: string; name: string }>;
}

export class ExecutionIdentityPlugin
  implements Plugin<void, ExecutionIdentityPluginStart, SetupDeps, StartDeps>
{
  private readonly logger: Logger;
  private readonly service: ExecutionIdentityService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.service = new ExecutionIdentityService(this.logger);
  }

  public setup(core: CoreSetup<StartDeps, ExecutionIdentityPluginStart>, plugins: SetupDeps) {
    this.logger.debug('executionIdentity: Setup');

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      category: { id: 'management', label: 'Management' },
      app: [PLUGIN_ID],
      privileges: {
        all: {
          app: [PLUGIN_ID],
          savedObject: { all: [], read: [] },
          ui: ['show', 'create', 'delete'],
        },
        read: {
          app: [PLUGIN_ID],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
    });

    core.savedObjects.registerType(ExecutionIdentitySavedObjectType);
    plugins.encryptedSavedObjects.registerType(ExecutionIdentityEncryptionParams);

    const router = core.http.createRouter();
    registerRoutes(router, this.service, this.logger);
  }

  public start(core: CoreStart, plugins: StartDeps): ExecutionIdentityPluginStart {
    this.logger.debug('executionIdentity: Start');
    this.service.setStartServices(core, plugins.encryptedSavedObjects);

    return {
      resolveIdentity: (id: string) => this.service.resolveIdentity(id),
    };
  }

  public stop() {}
}
