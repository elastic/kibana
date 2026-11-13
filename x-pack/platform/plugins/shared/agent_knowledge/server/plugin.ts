/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { AgentKnowledgeProduct, WikiTypePack } from '@kbn/agent-knowledge-common';
import { registerFeatures } from './features';
import { createTypePackRegistry } from './services/type_pack_registry';
import type { TypePackRegistry } from './services/type_pack_registry';
import { createWikiService } from './services/wiki_service';
import type { WikiService } from './services/wiki_service';
import { registerStepDefinitions } from './step_types';
import { registerWikiTelemetryEvents } from './telemetry/wiki_telemetry';
import type {
  AgentKnowledgePluginSetup,
  AgentKnowledgePluginStart,
  AgentKnowledgeSetupDependencies,
  AgentKnowledgeStartDependencies,
} from './types';

export class AgentKnowledgePlugin
  implements
    Plugin<
      AgentKnowledgePluginSetup,
      AgentKnowledgePluginStart,
      AgentKnowledgeSetupDependencies,
      AgentKnowledgeStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly typePacks: TypePackRegistry;
  private wikiService?: WikiService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.typePacks = createTypePackRegistry({ logger: this.logger });
  }

  setup(
    coreSetup: CoreSetup<AgentKnowledgeStartDependencies>,
    { features, workflowsExtensions }: AgentKnowledgeSetupDependencies
  ): AgentKnowledgePluginSetup {
    registerFeatures({ features });
    registerWikiTelemetryEvents(coreSetup.analytics);

    registerStepDefinitions({
      workflowsExtensions,
      getWikiService: () => this.requireWikiService(),
    });

    return {
      registerTypePack: (pack: WikiTypePack) => {
        this.typePacks.register(pack);
      },
      bindWikiAiIndex: (aiIndexId: string, product: AgentKnowledgeProduct) => {
        this.typePacks.bindAiIndex(aiIndexId, product);
      },
    };
  }

  start(coreStart: CoreStart, _plugins: AgentKnowledgeStartDependencies): AgentKnowledgePluginStart {
    this.wikiService = createWikiService({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger,
      typePacks: this.typePacks,
    });

    return {
      getWikiService: () => this.requireWikiService(),
      getTypePackRegistry: () => this.typePacks,
    };
  }

  stop() {}

  private requireWikiService(): WikiService {
    if (!this.wikiService) {
      throw new Error('Agent Knowledge wiki service is not available before plugin start');
    }
    return this.wikiService;
  }
}
