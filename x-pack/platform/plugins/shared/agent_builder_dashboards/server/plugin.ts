/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { AI_INSIGHTS_EMBEDDABLE_TYPE } from '../common/ai_insights/constants';
import type {
  AgentBuilderDashboardsSetupDependencies,
  AgentBuilderDashboardsStartDependencies,
  AgentBuilderDashboardsPluginSetup,
  AgentBuilderDashboardsPluginStart,
} from './types';
import { registerSkills } from './skills';
import { createDashboardAttachmentType } from './attachment_types';
import { createDashboardSmlType } from './sml_types';
import { aiInsightsEmbeddableSchema } from './embeddable/ai_insights_schema';
import { registerAiInsightsRoute } from './routes/ai_insights/register_route';
import { registerSeedDataRoute } from './routes/seed_data/register_route';

export class AgentBuilderDashboardsPlugin
  implements
    Plugin<
      AgentBuilderDashboardsPluginSetup,
      AgentBuilderDashboardsPluginStart,
      AgentBuilderDashboardsSetupDependencies,
      AgentBuilderDashboardsStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    coreSetup: CoreSetup<
      AgentBuilderDashboardsStartDependencies,
      AgentBuilderDashboardsPluginStart
    >,
    setupDeps: AgentBuilderDashboardsSetupDependencies
  ): AgentBuilderDashboardsPluginSetup {
    const getDashboardClient = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.dashboard.client;
    };

    setupDeps.agentBuilder.attachments.registerType(
      createDashboardAttachmentType({
        logger: this.logger,
        getDashboardClient,
      }) as Parameters<typeof setupDeps.agentBuilder.attachments.registerType>[0]
    );
    setupDeps.agentBuilderSml.registerType(createDashboardSmlType({ getDashboardClient }));

    registerSkills(setupDeps.agentBuilder);

    setupDeps.embeddable.registerEmbeddableServerDefinition(AI_INSIGHTS_EMBEDDABLE_TYPE, {
      title: i18n.translate('xpack.agentBuilderDashboards.aiInsights.serverTitle', {
        defaultMessage: 'AI insights',
      }),
      getSchema: () => aiInsightsEmbeddableSchema,
    });

    const router = coreSetup.http.createRouter();
    registerAiInsightsRoute({
      router,
      coreSetup,
      logger: this.logger,
    });
    registerSeedDataRoute({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: AgentBuilderDashboardsStartDependencies
  ): AgentBuilderDashboardsPluginStart {
    return {};
  }

  stop() {}
}
