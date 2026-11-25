/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerStepDefinitions } from './step_types';
import type {
  AgentKnowledgePluginSetup,
  AgentKnowledgePluginStart,
  AgentKnowledgeSetupDependencies,
  AgentKnowledgeStartDependencies,
} from './types';
import { createWikiRegistry } from './wiki/wiki_registry';

export class AgentKnowledgePlugin
  implements
    Plugin<
      AgentKnowledgePluginSetup,
      AgentKnowledgePluginStart,
      AgentKnowledgeSetupDependencies,
      AgentKnowledgeStartDependencies
    >
{
  private readonly registry = createWikiRegistry();
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    _core: CoreSetup,
    { workflowsExtensions }: AgentKnowledgeSetupDependencies
  ): AgentKnowledgePluginSetup {
    registerStepDefinitions({ workflowsExtensions, registry: this.registry, logger: this.logger });
    return { registerWiki: (definition) => this.registry.register(definition) };
  }

  start(_core: CoreStart): AgentKnowledgePluginStart {
    return {};
  }

  stop() {}
}
