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
import { map, type Subscription } from 'rxjs';
import { OpenFeature } from '@openfeature/server-sdk';
import type { Provider } from '@openfeature/server-sdk';
import { LaunchDarklyProvider } from '@launchdarkly/openfeature-node-server';
import type { LogLevelId } from '@kbn/logging';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { initializeMetadata, MetadataService } from '../common/metadata_service';
import { getAllFlags, registerUsageCollector } from './usage';
import { CachedOfrepProvider } from './ofrep_provider';
import type { CloudExperimentsConfigType } from './config';

interface CloudExperimentsPluginSetupDeps {
  cloud: CloudSetup;
  usageCollection: UsageCollectionSetup;
}

const ROLLOUT_EVALUATION_PROBE_FLAGS = ['cloudExperiments.rolloutEvaluationProbe'] as const;

export class CloudExperimentsPlugin implements Plugin<void, void, CloudExperimentsPluginSetupDeps> {
  private readonly logger: Logger;
  private readonly metadataService: MetadataService;
  private readonly rolloutEvaluationProbeSubscriptions: Subscription[] = [];
  private ofrepProvider?: CachedOfrepProvider;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get<CloudExperimentsConfigType>();

    this.metadataService = new MetadataService(
      { metadata_refresh_interval: config.metadata_refresh_interval },
      this.logger.get('metadata')
    );

    if (!config.launch_darkly && !config.ofrep && !initializerContext.env.mode.dev) {
      // Production needs a provider. Dev mode may use flag_overrides with neither.
      throw new Error(
        'xpack.cloud_integrations.experiments.launch_darkly or ofrep configuration should exist'
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

    const provider = this.createOpenFeatureProvider();
    if (provider) {
      core.featureFlags.setProvider(provider.provider);
      core.featureFlags.setInitialFeatureFlagsGetter(provider.getInitialFeatureFlags);
    }

    registerUsageCollector(deps.usageCollection, () => ({
      launchDarklyClient: provider?.launchDarklyClient,
      currentContext: OpenFeature.getContext(),
    }));
  }

  public start(core: CoreStart) {
    this.subscribeToRolloutEvaluationProbes(core);

    this.metadataService.start({
      hasDataFetcher: async () => await this.addHasDataMetadata(core),
    });
  }

  public stop() {
    void this.ofrepProvider?.onClose();
    this.rolloutEvaluationProbeSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.metadataService.stop();
  }

  private subscribeToRolloutEvaluationProbes(core: CoreStart): void {
    ROLLOUT_EVALUATION_PROBE_FLAGS.forEach((flagName) => {
      this.rolloutEvaluationProbeSubscriptions.push(
        core.featureFlags.getBooleanValue$(flagName, false).subscribe()
      );
    });
  }

  private createOpenFeatureProvider():
    | {
        provider: Provider;
        launchDarklyClient?: ReturnType<LaunchDarklyProvider['getClient']>;
        getInitialFeatureFlags: () => Promise<Record<string, unknown>>;
      }
    | undefined {
    const { launch_darkly: ldConfig, ofrep } =
      this.initializerContext.config.get<CloudExperimentsConfigType>();

    if (ofrep) {
      if (ldConfig) {
        this.logger.warn(
          'Both ofrep and launch_darkly are configured; the OFREP provider is used.'
        );
      }
      const ofrepProvider = new CachedOfrepProvider({
        baseUrl: ofrep.base_url,
        sdkKey: ofrep.sdk_key,
        pollIntervalMs: ofrep.poll_interval.asMilliseconds(),
        logger: this.logger,
      });
      this.ofrepProvider = ofrepProvider;
      return {
        provider: ofrepProvider,
        getInitialFeatureFlags: () => ofrepProvider.getBulkFlagValues(OpenFeature.getContext()),
      };
    }

    if (!ldConfig) return;

    const provider = new LaunchDarklyProvider(ldConfig.sdk_key, {
      logger: this.logger.get('launch-darkly'),
      application: {
        id: 'kibana-server',
        version:
          this.initializerContext.env.packageInfo.buildFlavor === 'serverless'
            ? this.initializerContext.env.packageInfo.buildSha
            : this.initializerContext.env.packageInfo.version,
      },
    });
    return {
      provider,
      launchDarklyClient: provider.getClient(),
      getInitialFeatureFlags: async () => {
        const { flags } = await getAllFlags(provider.getClient(), OpenFeature.getContext());
        return flags;
      },
    };
  }

  private async addHasDataMetadata(core: CoreStart): Promise<{ has_data: boolean }> {
    const repo = core.savedObjects.createInternalRepository();
    const { total } = await repo.find({ type: DATA_VIEW_SAVED_OBJECT_TYPE, perPage: 0 });
    return { has_data: total > 0 };
  }
}
