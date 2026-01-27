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
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { type Subscription } from 'rxjs';
import { cloudConnectedFeature } from './features';
import { registerRoutes } from './routes';
import {
  CloudConnectApiKeyType,
  CloudConnectApiKeyEncryptionParams,
} from './saved_objects/cloud_connect_api_key';
import type { CloudConnectConfig } from './config';
import { registerCloudConnectLicenseSync } from './lib/register_license_sync';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginStart {}

interface CloudConnectedSetupDeps {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
}

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
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
  private readonly config: CloudConnectConfig;
  private licenseSubscription?: Subscription;
  private isCloudEnabled = false;
  private cloudApiUrl?: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<CloudConnectConfig>();
    this.cloudApiUrl = `${this.config.cloudUrl}/api/v1`;
  }

  public setup(
    core: CoreSetup<CloudConnectedStartDeps, CloudConnectedPluginStart>,
    plugins: CloudConnectedSetupDeps
  ): CloudConnectedPluginSetup {
    this.logger.debug('cloudConnected: Setup');

    // Skip plugin registration if running on Elastic Cloud.
    // This plugin is only for self-managed clusters connecting to Cloud services
    if (plugins.cloud?.isCloudEnabled) {
      this.logger.debug('cloudConnected: Skipping setup - running on Elastic Cloud');
      this.isCloudEnabled = true;
      return {};
    }

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
      hasEncryptedSOEnabled: plugins.encryptedSavedObjects.canEncrypt,
      cloudApiUrl: this.cloudApiUrl!,
    });

    return {};
  }

  public start(core: CoreStart, plugins: CloudConnectedStartDeps): CloudConnectedPluginStart {
    this.logger.debug('cloudConnected: Started');

    // No-op if running on Elastic Cloud (plugin is effectively disabled there).
    if (this.isCloudEnabled) {
      return {};
    }

    this.licenseSubscription = registerCloudConnectLicenseSync({
      savedObjects: core.savedObjects,
      elasticsearchClient: core.elasticsearch.client.asInternalUser,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      licensing: plugins.licensing,
      logger: this.logger,
      cloudApiUrl: this.cloudApiUrl!,
    });

    return {};
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
    this.licenseSubscription = undefined;
  }
}
