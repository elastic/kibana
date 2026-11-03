/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  ActionsApiRequestHandlerContext,
} from '@kbn/actions-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { getService, register as registerDataService } from './data';
import type { ConnectorBuilderInferenceEndpoints } from './register_inference_feature';
import { registerConnectorBuilderInferenceFeature } from './register_inference_feature';
import { createHealthRoute, createConfigRoute, createGenerateConnectorTypeRoute } from './routes';

type TriggersActionsUiRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
}>;

const BASE_TRIGGERS_ACTIONS_UI_API_PATH = '/internal/triggers_actions_ui';

export interface PluginStartContract {
  data: ReturnType<typeof getService>;
}

interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  alerting: AlertingServerSetup;
  actions: ActionsPluginSetup;
  searchInferenceEndpoints?: ConnectorBuilderInferenceEndpoints;
}

interface TriggersActionsPluginStart {
  alerting: AlertingServerStart;
  inference?: InferenceServerStart;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.data = getService();
  }

  public setup(
    core: CoreSetup<TriggersActionsPluginStart, PluginStartContract>,
    plugins: PluginsSetup
  ): void {
    const router = core.http.createRouter();
    const typedRouter = core.http.createRouter<TriggersActionsUiRequestHandlerContext>();
    registerConnectorBuilderInferenceFeature(plugins.searchInferenceEndpoints, this.logger);
    registerDataService({
      logger: this.logger,
      data: this.data,
      router,
      baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
    });

    createHealthRoute(
      this.logger,
      typedRouter,
      BASE_TRIGGERS_ACTIONS_UI_API_PATH,
      plugins.alerting !== undefined
    );

    createConfigRoute({
      logger: this.logger,
      router,
      baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
      alertingConfig: plugins.alerting.getConfig,
      getRulesClientWithRequest: async (request) => {
        const [, pluginStart] = await core.getStartServices();
        return pluginStart.alerting.getRulesClientWithRequest(request);
      },
    });

    createGenerateConnectorTypeRoute({
      logger: this.logger,
      router,
      baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
      getActionsConfigurationUtilities: () => plugins.actions.getActionsConfigurationUtilities(),
      getInference: async () => (await core.getStartServices())[1].inference,
    });
  }

  public start(): PluginStartContract {
    return {
      data: this.data,
    };
  }
}
