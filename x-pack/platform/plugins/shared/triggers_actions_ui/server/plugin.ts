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
  KibanaRequest,
} from '@kbn/core/server';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  ActionsApiRequestHandlerContext,
} from '@kbn/actions-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getService, register as registerDataService } from './data';
import type { ConnectorBuilderInferenceEndpoints } from './register_inference_feature';
import { registerConnectorBuilderInferenceFeature } from './register_inference_feature';
import {
  createHealthRoute,
  createConfigRoute,
  createGenerateConnectorTypeRoute,
  createConnectorTypeLogoRoute,
} from './routes';
import { generateFromDocumentation } from './routes/generate_connector_type/generate_from_documentation';
import { authorizeDraftGeneration } from './routes/generate_connector_type/authorize_draft_generation';
import { fetchConnectorTypeLogo } from './routes/connector_type_logo/fetch_logo';

type TriggersActionsUiRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
}>;

const BASE_TRIGGERS_ACTIONS_UI_API_PATH = '/internal/triggers_actions_ui';

export interface PluginStartContract {
  data: ReturnType<typeof getService>;
  generateConnectorTypeDraft: (
    url: string,
    request: KibanaRequest
  ) => Promise<{ draft: CreateConnectorTypeRequest; logoUrl?: string }>;
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
  security: SecurityPluginStart;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];
  private generateConnectorTypeDraft?: PluginStartContract['generateConnectorTypeDraft'];

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
    createConnectorTypeLogoRoute({
      logger: this.logger,
      router,
      baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
      getActionsConfigurationUtilities: () => plugins.actions.getActionsConfigurationUtilities(),
    });
    this.generateConnectorTypeDraft = async (url, request) => {
      const [, { security }] = await core.getStartServices();
      await authorizeDraftGeneration(security, request);
      const {
        connectorType: draft,
        logoUrl,
        documentUrl,
      } = await generateFromDocumentation({
        url,
        request,
        getInference: async () => (await core.getStartServices())[1].inference,
        getActionsConfigurationUtilities: () => plugins.actions.getActionsConfigurationUtilities(),
        logger: this.logger,
      });
      const fallbackUrl = new URL('/favicon.ico', documentUrl).toString();
      const candidates =
        logoUrl && logoUrl !== fallbackUrl ? [logoUrl, fallbackUrl] : [fallbackUrl];
      for (const candidate of candidates) {
        try {
          const icon = await fetchConnectorTypeLogo({
            url: candidate,
            configurationUtilities: plugins.actions.getActionsConfigurationUtilities(),
            logger: this.logger,
          });
          return { draft: { ...draft, icon }, logoUrl: candidate };
        } catch {
          // Try the conventional favicon path if the page's icon link cannot be loaded.
        }
      }
      return { draft };
    };
  }

  public start(): PluginStartContract {
    const generateConnectorTypeDraft = this.generateConnectorTypeDraft;
    if (!generateConnectorTypeDraft) {
      throw new Error('Connector type draft generation is not ready.');
    }
    return {
      data: this.data,
      generateConnectorTypeDraft,
    };
  }
}
