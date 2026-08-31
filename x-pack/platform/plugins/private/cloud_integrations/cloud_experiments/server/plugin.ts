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
import { map } from 'rxjs';
import { OpenFeature } from '@openfeature/server-sdk';
import { LaunchDarklyProvider } from '@launchdarkly/openfeature-node-server';
import type { LogLevelId } from '@kbn/logging';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { initializeMetadata, MetadataService } from '../common/metadata_service';
import { getAllFlags, registerUsageCollector } from './usage';
import type { CloudExperimentsConfigType } from './config';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
  usageCollection: UsageCollectionSetup;
}

export class CloudExperimentsPlugin implements Plugin<void, void, CloudExperimentsPluginSetupDeps> {
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<CloudExperimentsConfigType>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: config.metadata_refresh_interval },
      this.logger.get('metadata')
    );

    const ldConfig = config.launch_darkly; // If the plugin is enabled and no flag_overrides are provided (dev mode only), launch_darkly must exist
    if (!ldConfig && !initializerContext.env.mode.dev) {
      // If the plugin is enabled, and it's in prod mode, launch_darkly must exist
      // (config-schema should enforce it, but just in case).
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    }
  }

  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    // Ideally we should have something like this for the browser as well.
    core.logging.configure(
      this.initializerContext.config.create<CloudExperimentsConfigType>().pipe(
        map(({ launch_darkly: { client_log_level: clientLogLevel = 'none' } = {} }) => {
          const logLevel = clientLogLevel.replace('none', 'off') as LogLevelId;
          return { loggers: [{ name: 'launch-darkly', level: logLevel, appenders: [] }] };
        })
      )
    );

    initializeMetadata({
      metadataService: this.metadataService,
      initializerContext: this.initializerContext,
      cloud: deps.cloud,
      featureFlags: core.featureFlags,
      logger: this.logger,
    });

    const launchDarklyOpenFeatureProvider = this.createOpenFeatureProvider();
    if (launchDarklyOpenFeatureProvider) {
      core.featureFlags.setProvider(launchDarklyOpenFeatureProvider);
      core.featureFlags.setInitialFeatureFlagsGetter(async () => {
        const launchDarklyClient = launchDarklyOpenFeatureProvider.getClient();
        const context = OpenFeature.getContext();
        const { flags } = await getAllFlags(launchDarklyClient, context);
        return flags;
      });
    }

    registerUsageCollector(deps.usageCollection, () => ({
      launchDarklyClient: launchDarklyOpenFeatureProvider?.getClient(),
      currentContext: OpenFeature.getContext(),
    }));
  }

  public start(core: CoreStart) {
    this.metadataService.start({
      hasDataFetcher: async () => await this.addHasDataMetadata(core),
    });
  }

  public stop() {
    this.metadataService.stop();
  }

  private createOpenFeatureProvider() {
    const { launch_darkly: ldConfig } =
      this.initializerContext.config.get<CloudExperimentsConfigType>();

    if (!ldConfig) return;

    return new LaunchDarklyProvider(ldConfig.sdk_key, {
      logger: this.logger.get('launch-darkly'),
      application: {
        id: 'kibana-server',
        version:
          this.initializerContext.env.packageInfo.buildFlavor === 'serverless'
            ? this.initializerContext.env.packageInfo.buildSha
            : this.initializerContext.env.packageInfo.version,
      },
    });
  }

  private async addHasDataMetadata(core: CoreStart): Promise<{ has_data: boolean }> {
    const repo = core.savedObjects.createInternalRepository();
    // same semantics as the previous data-views service check: any data view saved object exists
    const { total } = await repo.find({ type: 'index-pattern', perPage: 0 });
    return { has_data: total > 0 };
  }
}
