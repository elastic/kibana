/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { cloudConnectedFeature } from './features';
import { registerRoutes } from './routes';
import {
  CloudConnectApiKeyType,
  CloudConnectApiKeyEncryptionParams,
} from './saved_objects/cloud_connect_api_key';

export interface CloudConnectedPluginSetup {}

export interface CloudConnectedPluginStart {}

interface CloudConnectedSetupDeps {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class CloudConnectedPlugin
  implements
    Plugin<
      CloudConnectedPluginSetup,
      CloudConnectedPluginStart,
      CloudConnectedSetupDeps,
      CloudConnectedStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<CloudConnectedStartDeps, CloudConnectedPluginStart>,
    plugins: CloudConnectedSetupDeps
  ): CloudConnectedPluginSetup {
    this.logger.debug('cloudConnected: Setup');

    // Register the feature with privileges
    plugins.features.registerKibanaFeature(cloudConnectedFeature);

    // Register the saved object type for API key storage
    core.savedObjects.registerType(CloudConnectApiKeyType);

    // Register encryption for the API key saved object
    plugins.encryptedSavedObjects.registerType(CloudConnectApiKeyEncryptionParams);

    // Register HTTP routes
    const router = core.http.createRouter();
    registerRoutes({
      router,
      logger: this.logger,
      getStartServices: core.getStartServices,
    });

    return {};
  }

  public start(core: CoreStart): CloudConnectedPluginStart {
    this.logger.debug('cloudConnected: Started');
    return {};
  }

  public stop() {}
}
