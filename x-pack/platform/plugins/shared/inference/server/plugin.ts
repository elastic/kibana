/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  BoundInferenceClient,
  InferenceClient,
  AnonymizationSettings,
} from '@kbn/inference-common';
import { aiAnonymizationSettings } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import { createClient as createInferenceClient, createChatModel } from './inference_client';
import { RegexWorkerService } from './chat_complete/anonymization/regex_worker_service';
import { registerRoutes } from './routes';
import type { InferenceConfig } from './config';
import type {
  InferenceBoundClientCreateOptions,
  InferenceClientCreateOptions,
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';
import { uiSettings } from '../common/ui_settings';
import { getConnectorList } from './util/get_connector_list';
import { loadDefaultConnector } from './util/load_default_connector';
import { getConnectorById } from './util/get_connector_by_id';

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

  constructor(context: PluginInitializerContext<InferenceConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get<InferenceConfig>();
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferenceServerSetup {
    coreSetup.uiSettings.register(uiSettings);
    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {};
  }

  start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart {
    this.regexWorker = new RegexWorkerService(
      this.config.workers.anonymization,
      this.logger.get('regex_worker')
    );

    const createAnonymizationRulesPromise = async (request: KibanaRequest) => {
      const soClient = core.savedObjects.getScopedClient(request);
      const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
      const settingsStr = await uiSettingsClient.get<string | undefined>(aiAnonymizationSettings);

      if (!settingsStr) {
        return [];
      }

      try {
        const settings = JSON.parse(settingsStr) as AnonymizationSettings;
        return settings.rules || [];
      } catch (error) {
        this.logger.error('Failed to parse anonymization settings:', error);
        return [];
      }
    };

    return {
      getClient: <T extends InferenceClientCreateOptions>(options: T) => {
        return createInferenceClient({
          ...options,
          anonymizationRulesPromise: createAnonymizationRulesPromise(options.request),
          regexWorker: this.regexWorker!,
          actions: pluginsStart.actions,
          logger: this.logger.get('client'),
          esClient: core.elasticsearch.client.asScoped(options.request).asCurrentUser,
        }) as T extends InferenceBoundClientCreateOptions ? BoundInferenceClient : InferenceClient;
      },

      getChatModel: async (options) => {
        return createChatModel({
          request: options.request,
          connectorId: options.connectorId,
          chatModelOptions: options.chatModelOptions,
          callbacks: options.callbacks,
          actions: pluginsStart.actions,
          anonymizationRulesPromise: createAnonymizationRulesPromise(options.request),
          regexWorker: this.regexWorker!,
          esClient: core.elasticsearch.client.asScoped(options.request).asCurrentUser,
          logger: this.logger,
        });
      },

      getConnectorList: async (request: KibanaRequest) => {
        return getConnectorList({ actions: pluginsStart.actions, request });
      },
      getDefaultConnector: async (request: KibanaRequest) => {
        return loadDefaultConnector({ actions: pluginsStart.actions, request });
      },
      getConnectorById: async (id: string, request: KibanaRequest) => {
        return getConnectorById({ connectorId: id, actions: pluginsStart.actions, request });
      },
    };
  }

  async stop() {
    await this.regexWorker?.stop();
  }
}
