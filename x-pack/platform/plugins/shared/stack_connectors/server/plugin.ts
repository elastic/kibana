/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
} from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type {
  CatalogActionType,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';

import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { registerInferenceConnectorsUsageCollector } from './usage/inference/inference_connectors_usage_collector';
import { registerConnectorTypes } from './connector_types';
import {
  getWellKnownEmailServiceRoute,
  getWebhookSecretHeadersKeyRoute,
  getHttpSecretQueryParamsKeyRoute,
} from './routes';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema as StackConnectorsConfigType } from './config';
import { registerConnectorTypesFromSpecs } from './connector_types_from_spec';
import {
  CatalogSpecSource,
  DeclarativeCatalogService,
  DiskSnapshotSource,
  SpecVersionLoader,
  createVersionedConnectorType,
  registerDeclarativeCatalogRoutes,
  createCatalogSpecProvider,
  toKibanaMinor,
  registerCatalogRefreshTask,
  scheduleCatalogRefreshTask,
  refreshIntervalToSchedule,
} from './declarative_connectors';
import type { VersionedTypeFactory } from './declarative_connectors';

export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
}

export interface ConnectorsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginStartContract;
  taskManager: TaskManagerStartContract;
  spaces: SpacesPluginSetup;
  licensing: LicensingPluginStart;
}

export class StackConnectorsPlugin
  implements Plugin<void, void, ConnectorsPluginsSetup, ConnectorsPluginsStart>
{
  private config: StackConnectorsConfigType;
  private readonly logger: Logger;
  readonly experimentalFeatures: ExperimentalFeatures;

  // Whether this is a Serverless deployment, and — if so — whether its organization is in trial.
  // Serverless projects always report an `enterprise` ES license, so their trial status can only
  // come from Cloud config (which is static for the process lifetime).
  private isServerless = false;
  private isServerlessTrial = false;
  private licensing?: LicensingPluginStart;
  private declarativeCatalog?: DeclarativeCatalogService;
  private registerCatalogType?: (actionType: CatalogActionType) => void;
  private readonly kibanaMinor: string;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get();
    this.logger = context.logger.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
    this.kibanaMinor = toKibanaMinor(context.env.packageInfo.version);
  }

  // Trial detection for the Elastic-managed email SMTP relay (the `elastic_cloud` service).
  private isElasticCloudTrial = async (): Promise<boolean> => {
    if (this.isServerless) {
      return this.isServerlessTrial;
    }
    // On ECH the ES license tier reflects the current subscription. `getLicense()` reads the
    // licensing plugin's cached license (no ES round-trip), so a trial -> paid conversion is
    // picked up without a Kibana restart.
    const license = await this.licensing?.getLicense();
    return license?.type === 'trial';
  };

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    // Serverless trial status is only available on the Cloud setup contract and is static config,
    // so capture it here. The live ECH license is tracked from the licensing observable in start().
    this.isServerless = plugins.cloud?.isServerlessEnabled ?? false;
    this.isServerlessTrial = plugins.cloud?.serverless.organizationInTrial ?? false;

    const awsSesConfig = actions.getActionsConfigurationUtilities().getAwsSesConfig();

    getWellKnownEmailServiceRoute(router, awsSesConfig);
    getWebhookSecretHeadersKeyRoute(router, core.getStartServices);
    getHttpSecretQueryParamsKeyRoute(router, core.getStartServices);

    if (this.config.declarativeCatalog?.enabled) {
      const { registryUrl, refreshIntervalMs } = this.config.declarativeCatalog;
      const source = new CatalogSpecSource({ registryUrl, logger: this.logger });
      const loader = new SpecVersionLoader({
        logger: this.logger,
        registrySource: source,
        diskSource: new DiskSnapshotSource(),
      });
      const buildType: VersionedTypeFactory = ({ id, versions, activeVersion }) =>
        createVersionedConnectorType({
          id,
          versions,
          activeVersion,
          actions,
          logger: this.logger,
          loadVersion: loader.load,
        });
      this.declarativeCatalog = new DeclarativeCatalogService({
        source,
        registryUrl,
        refreshIntervalMs,
        logger: this.logger,
        kibanaMinor: this.kibanaMinor,
        buildType,
        onStorageReady: (storage) => loader.setStorage(storage),
      });
      registerCatalogRefreshTask(plugins.taskManager, () => this.declarativeCatalog);
      actions.registerSpecProvider(
        createCatalogSpecProvider({
          logger: this.logger,
          kibanaMinor: this.kibanaMinor,
          buildType,
          onBoot: (result) => this.declarativeCatalog?.recordIndexBoot(result),
        })
      );
      registerDeclarativeCatalogRoutes({ router, service: this.declarativeCatalog });
    }

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
      isElasticCloudTrial: this.isElasticCloudTrial,
    });

    if (this.experimentalFeatures.connectorsFromSpecs) {
      registerConnectorTypesFromSpecs({ actions });
    }

    this.registerCatalogType = (actionType) => actions.registerType(actionType);

    if (plugins.usageCollection) {
      registerInferenceConnectorsUsageCollector(plugins.usageCollection, core);
    }
  }

  public async start(core: CoreStart, plugins: ConnectorsPluginsStart): Promise<void> {
    this.licensing = plugins.licensing;
    if (this.declarativeCatalog && this.registerCatalogType) {
      await this.declarativeCatalog.start({
        registerType: this.registerCatalogType,
        isTypeRegistered: (id) => plugins.actions.getAllTypes().includes(id),
        esClient: core.elasticsearch.client.asInternalUser,
        savedObjectsRepository: core.savedObjects.createInternalRepository(['action']),
      });
      await scheduleCatalogRefreshTask(
        plugins.taskManager,
        refreshIntervalToSchedule(this.config.declarativeCatalog.refreshIntervalMs),
        this.logger
      );
    }
  }

  public stop() {
    this.declarativeCatalog?.stop();
  }
}
