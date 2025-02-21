/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { ApiPrivileges } from '@kbn/security-authorization-core-common';
import { OBSERVABILITY_AI_ASSISTANT_FEATURE_ID } from '../common/feature';
import type { ObservabilityAIAssistantConfig } from './config';
import { registerServerRoutes } from './routes/register_routes';
import { ObservabilityAIAssistantRouteHandlerResources } from './routes/types';
import { ObservabilityAIAssistantService } from './service';
import {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
} from './types';
import { registerFunctions } from './functions';
import { recallRankingEvent } from './analytics/recall_ranking';
import { initLangtrace } from './service/client/instrumentation/init_langtrace';
import { aiAssistantCapabilities } from '../common/capabilities';
import { registerAndScheduleKbSemanticTextMigrationTask } from './service/task_manager_definitions/register_kb_semantic_text_migration_task';
import { updateExistingIndexAssets } from './service/create_or_update_index_assets';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantServerSetup,
      ObservabilityAIAssistantServerStart,
      ObservabilityAIAssistantPluginSetupDependencies,
      ObservabilityAIAssistantPluginStartDependencies
    >
{
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  service: ObservabilityAIAssistantService | undefined;
  private isDev: boolean;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantConfig>) {
    this.isDev = context.env.mode.dev;
    this.logger = context.logger.get();
    this.config = context.config.get<ObservabilityAIAssistantConfig>();
    initLangtrace();
  }
  public setup(
    core: CoreSetup<
      ObservabilityAIAssistantPluginStartDependencies,
      ObservabilityAIAssistantServerStart
    >,
    plugins: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantServerSetup {
    plugins.features.registerKibanaFeature({
      id: OBSERVABILITY_AI_ASSISTANT_FEATURE_ID,
      name: i18n.translate('xpack.observabilityAiAssistant.featureRegistry.featureName', {
        defaultMessage: 'Observability AI Assistant',
      }),
      order: 8600,
      category: DEFAULT_APP_CATEGORIES.observability,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
      catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
      minimumLicense: 'enterprise',
      // see x-pack/platform/plugins/shared/features/common/feature_kibana_privileges.ts
      privileges: {
        all: {
          app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
          api: [
            OBSERVABILITY_AI_ASSISTANT_FEATURE_ID,
            'ai_assistant',
            ApiPrivileges.manage('llm_product_doc'),
          ],
          catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [aiAssistantCapabilities.show],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityAIAssistantPluginStartDependencies
            ];
          }),
      };
    }) as Pick<
      ObservabilityAIAssistantRouteHandlerResources['plugins'],
      keyof ObservabilityAIAssistantPluginStartDependencies
    >;

    const withCore = {
      ...routeHandlerPlugins,
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    };

    const service = (this.service = new ObservabilityAIAssistantService({
      logger: this.logger.get('service'),
      core,
      config: this.config,
    }));

    // Update existing index assets (mappings, templates, etc). This will not create assets if they do not exist.
    const indexAssetsUpdatedPromise = updateExistingIndexAssets({
      logger: this.logger.get('index_assets'),
      core,
    }).catch((e) => this.logger.error(`Index assets could not be updated: ${e.message}`));

    // register task to migrate knowledge base entries to include semantic_text field
    registerAndScheduleKbSemanticTextMigrationTask({
      core,
      taskManager: plugins.taskManager,
      logger: this.logger.get('kb_semantic_text_migration_task'),
      config: this.config,
      indexAssetsUpdatedPromise,
    }).catch((e) =>
      this.logger.error(
        `Knowledge base semantic_text migration task could not be registered: ${e.message}`
      )
    );

    service.register(registerFunctions);

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: withCore,
        service: this.service,
      },
      isDev: this.isDev,
    });

    core.analytics.registerEventType(recallRankingEvent);

    return {
      service,
    };
  }

  public start(): ObservabilityAIAssistantServerStart {
    return {
      service: this.service!,
    };
  }
}
