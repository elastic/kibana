/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { type LDLogLevel, basicLogger } from '@launchdarkly/js-client-sdk';
import { LaunchDarklyClientProvider } from '@openfeature/launchdarkly-client-provider';
import { initializeMetadata, MetadataService } from '../common/metadata_service';
import { SeededOfrepWebProvider } from './seeded_ofrep_provider';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
}

interface CloudExperimentsPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
}

interface LaunchDarklyClientConfig {
  client_id: string;
  client_log_level: LDLogLevel;
}

interface OfrepClientConfig {
  base_url: string;
  client_id: string;
  poll_interval?: string;
}

/**
 * Browser-side implementation of the Cloud Experiments plugin
 */
export class CloudExperimentsPlugin
  implements Plugin<void, void, CloudExperimentsPluginSetupDeps, CloudExperimentsPluginStartDeps>
{
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;

  /** Constructor of the plugin **/
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<{
      launch_darkly?: LaunchDarklyClientConfig;
      ofrep?: OfrepClientConfig;
      metadata_refresh_interval: string;
    }>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: duration(config.metadata_refresh_interval) },
      this.logger.get('metadata')
    );

    if (
      !config.launch_darkly?.client_id &&
      !config.ofrep?.client_id &&
      !initializerContext.env.mode.dev
    ) {
      // Production needs a provider. Dev mode may use flag_overrides with neither.
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly or ofrep configuration should exist'
      );
    }
  }

  /**
   * Sets up the A/B testing client only if cloud is enabled
   * @param core {@link CoreSetup}
   * @param deps {@link CloudExperimentsPluginSetupDeps}
   */
  public setup(core: CoreSetup, deps: CloudExperimentsPluginSetupDeps) {
    initializeMetadata({
      metadataService: this.metadataService,
      initializerContext: this.initializerContext,
      cloud: deps.cloud,
      featureFlags: core.featureFlags,
      logger: this.logger,
    });

    const initialFeatureFlags = core.featureFlags.getInitialFeatureFlags();
    const openFeatureProvider = this.createOpenFeatureProvider(initialFeatureFlags);
    if (openFeatureProvider) {
      core.featureFlags.setProvider(openFeatureProvider);
    }
  }

  /**
   * Sets the metadata service update hooks
   * @param core {@link CoreStart}
   * @param deps {@link CloudExperimentsPluginStartDeps}
   */
  public start(core: CoreStart, { dataViews }: CloudExperimentsPluginStartDeps) {
    this.metadataService.start({
      hasDataFetcher: async () => ({ has_data: await dataViews.hasData.hasDataView() }),
    });
  }

  /**
   * Cleans up and flush the sending queues.
   */
  public stop() {
    this.metadataService.stop();
  }

  /**
   * Sets up the OpenFeature LaunchDarkly provider
   * @internal
   */
  private createOpenFeatureProvider(initialFeatureFlags: Record<string, unknown>) {
    const { launch_darkly: ldConfig, ofrep } = this.initializerContext.config.get<{
      launch_darkly?: LaunchDarklyClientConfig;
      ofrep?: OfrepClientConfig;
    }>();

    if (ofrep?.base_url && ofrep.client_id) {
      const pollInterval = duration(ofrep.poll_interval ?? '30s').asMilliseconds();
      try {
        return new SeededOfrepWebProvider({
          initialFlags: initialFeatureFlags,
          logger: this.logger,
          ofrep: {
            baseUrl: ofrep.base_url,
            headers: [['Authorization', `Bearer ${ofrep.client_id}`]],
            // Poll for changes rather than assuming the OFREP server advertises an event stream.
            pollInterval: pollInterval > 0 ? pollInterval : 30_000,
            // Attempt to use SSE for change detection, falling back to polling if not supported.
            changeDetection: 'sse',
            // This option blocks the OFREP provider until the remote fetch completes. The wrapper `SeededOfrepWebProvider` serves injected flags as `initialFlags` until the remote provider is ready.
            cacheMode: 'network-first',
          },
        });
      } catch (error) {
        this.logger.error('Error initializing the OFREP client', error);
        return;
      }
    }

    if (!ldConfig) return;

    const bootstrap = Object.keys(initialFeatureFlags).length > 0 ? initialFeatureFlags : undefined;

    return new LaunchDarklyClientProvider(ldConfig.client_id, {
      // logger: this.logger.get('launch-darkly'),
      // Using basicLogger for now because we can't limit the level for now if we're using core's logger.
      logger: basicLogger({ level: ldConfig.client_log_level }),
      streaming: true, // Necessary to react to flag changes
      applicationInfo: {
        id: 'kibana-browser',
        version:
          this.initializerContext.env.packageInfo.buildFlavor === 'serverless'
            ? this.initializerContext.env.packageInfo.buildSha
            : this.initializerContext.env.packageInfo.version,
      },
      bootstrap,
      // Remove the query params from the URL
      eventUrlTransformer: (url) => url.split('?')[0],
    });
  }
}
