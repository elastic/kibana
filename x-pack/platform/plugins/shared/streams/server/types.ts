/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  RuleRegistryPluginSetupContract as RuleRegistryPluginSetup,
  RuleRegistryPluginStartContract as RuleRegistryPluginStart,
} from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { FieldsMetadataServerStart } from '@kbn/fields-metadata-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ConsoleStart as ConsoleServerStart } from '@kbn/console-plugin/server';
import type { StreamsConfig } from '../common/config';

export interface StreamsServer {
  core: CoreStart;
  config: StreamsConfig;
  logger: Logger;
  security: SecurityPluginStart;
  actions: ActionsPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}

export interface ElasticsearchAccessorOptions {
  elasticsearchClient: ElasticsearchClient;
}

export interface StreamsPluginSetupDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  alerting: AlertingServerSetup;
  ruleRegistry: RuleRegistryPluginSetup;
  features: FeaturesPluginSetup;
  usageCollection: UsageCollectionSetup;
  cloud?: CloudSetup;
  globalSearch?: GlobalSearchPluginSetup;
}

export interface StreamsPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  taskManager: TaskManagerStartContract;
  alerting: AlertingServerStart;
  inference: InferenceServerStart;
  ruleRegistry: RuleRegistryPluginStart;
  fieldsMetadata: FieldsMetadataServerStart;
  console: ConsoleServerStart;
  spaces?: SpacesPluginStart;
}
