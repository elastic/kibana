/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { EntityManagerConfig } from '../common/config';

export interface EntityManagerServerSetup {
  core: CoreStart;
  config: EntityManagerConfig;
  logger: Logger;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  isServerless: boolean;
}

export interface ElasticsearchAccessorOptions {
  elasticsearchClient: ElasticsearchClient;
}

export interface EntityManagerPluginSetupDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  features: FeaturesPluginSetup;
}

export interface EntityManagerPluginStartDependencies {
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
}
