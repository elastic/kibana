/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { RegexWorkerService, getAnonymizationUiSettings } from '@kbn/ai-anonymization-server';
import { registerRoutes } from './routes';
import { createInferenceStart } from './runtime';
import { inferenceBridge } from './tasks/bridge';
import type { InferenceConfig } from './config';
import type {
  FeatureEndpointResolver,
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';
import { InferenceEndpointIdCache } from './util/inference_endpoint_id_cache';
import { TokenUsageLogger } from './token_usage';
import { installTokenUsageDashboard } from './dashboard';

export {
  createInferenceStreamingResolver,
  resolveOnFailureMode,
  resolveReplacementsEncryptionKey,
} from './runtime';

export class InferencePlugin
  implements
    Plugin<
      InferenceServerSetup,
      InferenceServerStart,
      InferenceSetupDependencies,
      InferenceStartDependencies
    >
{
  private logger: Logger;
  private config: InferenceConfig;
  private regexWorker?: RegexWorkerService;
  private endpointIdCache: InferenceEndpointIdCache;
  private tokenUsageLogger: TokenUsageLogger;
  private featureEndpointResolver?: FeatureEndpointResolver;

  constructor(context: PluginInitializerContext<InferenceConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get<InferenceConfig>();
    this.endpointIdCache = new InferenceEndpointIdCache();
    this.tokenUsageLogger = new TokenUsageLogger(this.logger);
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferenceServerSetup {
    coreSetup.uiSettings.register(getAnonymizationUiSettings());
    // The settings page's pattern tester runs caller-supplied regexes, which is only safe on worker
    // threads, so it follows whether this plugin runs anonymization on them.
    pluginsSetup.aiAnonymizationSettings?.configurePatternTester({
      enabled: this.config.workers.anonymization.enabled,
    });
    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    const setupContract: InferenceServerSetup = {
      registerFeatureEndpointResolver: (resolver) => {
        if (this.featureEndpointResolver) {
          throw new Error('A feature endpoint resolver is already registered');
        }
        this.featureEndpointResolver = resolver;
      },
    };
    inferenceBridge.setSetup(setupContract);
    return setupContract;
  }

  start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart {
    // Two anonymization implementations coexist here:
    //  - Legacy (live): rules from the `ai:anonymizationSettings` uiSetting, no persisted replacements.
    //  - Policy-service (dormant): profiles, per-space salt and persistent replacements from the
    //    `anonymization` plugin, awaiting removal. The pipeline no longer applies that plugin's
    //    field policies, so re-activating it would NOT mask fields it is configured to mask.
    // `anonymization.isEnabled()` is backed by the hard-coded `ANONYMIZATION_FEATURE_ACTIVE = false`,
    // so this is always false and every `anonymizationEnabled` branch below is dead code. Treat the
    // uiSetting path as the only real one.
    const anonymizationEnabled = pluginsStart.anonymization?.isEnabled() ?? false;

    const installDashboardIfTokenUsageTrackingEnabled = async () => {
      const internalRepository = core.savedObjects.createInternalRepository();
      const internalClient = new SavedObjectsClient(internalRepository);
      const uiSettingsClient = core.uiSettings.asScopedToClient(internalClient);
      const isEnabled = await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING);
      if (!isEnabled) {
        return;
      }
      const savedObjectsImporter = core.savedObjects.createImporter(internalClient);
      await installTokenUsageDashboard(savedObjectsImporter, this.logger);
    };

    // Apply mapping changes to an existing data stream at startup, so that during a rolling upgrade
    // the mappings are in place before any node writes documents with new fields.
    this.tokenUsageLogger.updateExistingDataStream().catch((e) => {
      this.logger.error(`Failed to update token usage data stream: ${e.message}`);
    });

    installDashboardIfTokenUsageTrackingEnabled().catch((e) => {
      this.logger.error(`Failed to install token usage dashboard: ${e.message}`);
    });

    if (anonymizationEnabled) {
      this.logger.info(
        'Persistent anonymization replacements key material is auto-managed per space via the anonymization plugin'
      );
    }

    const regexWorker = new RegexWorkerService(
      this.config.workers.anonymization,
      this.logger.get('regex_worker')
    );
    this.regexWorker = regexWorker;

    const start = createInferenceStart({
      core,
      pluginsStart,
      logger: this.logger,
      endpointIdCache: this.endpointIdCache,
      tokenUsageLogger: this.tokenUsageLogger,
      regexWorker,
      getFeatureEndpointResolver: () => this.featureEndpointResolver,
    });
    inferenceBridge.setStart(start);
    return {
      ...start,
      installTokenUsageDashboard: async () => {
        const internalRepository = core.savedObjects.createInternalRepository();
        const internalClient = new SavedObjectsClient(internalRepository);
        const savedObjectsImporter = core.savedObjects.createImporter(internalClient);
        await installTokenUsageDashboard(savedObjectsImporter, this.logger);
      },
    };
  }

  async stop() {
    await this.regexWorker?.stop();
  }
}
