/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AdaptiveUiPluginSetup,
  AdaptiveUiPluginStart,
} from './types';
import { registerAdaptiveUiViewAttachment } from './attachment_types/adaptive_ui_view';
import { registerAdaptiveUiTools } from './tools';
import { createAdaptiveUiViewRegistry } from './registered_views';
import { viewRendererTypeDefinition } from './renderers/view_renderer';

export class AdaptiveUiPlugin
  implements
    Plugin<
      AdaptiveUiPluginSetup,
      AdaptiveUiPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AdaptiveUiPluginStart>,
    { agentBuilder }: PluginSetupDependencies
  ): AdaptiveUiPluginSetup {
    const registry = createAdaptiveUiViewRegistry();

    // Actions start isn't available until start; resolve it lazily at tool-call time.
    const getActions = async () => {
      const [, { actions }] = await coreSetup.getStartServices();
      return actions;
    };
    const getSignificantEvents = async () => {
      const [, { significantEvents }] = await coreSetup.getStartServices();
      return significantEvents;
    };
    const getNightshiftInvestigations = async () => {
      const [, { nightshiftInvestigations }] = await coreSetup.getStartServices();
      return nightshiftInvestigations;
    };

    registerAdaptiveUiViewAttachment(agentBuilder);
    registerAdaptiveUiTools(agentBuilder, {
      registry,
      getActions,
      http: coreSetup.http,
      getSignificantEvents,
      getNightshiftInvestigations,
    });
    agentBuilder.renderers.register(viewRendererTypeDefinition);

    this.logger.debug('Adaptive UI attachment, tools, and view renderer registered.');
    return {};
  }

  start(_coreStart: CoreStart, _startDeps: PluginStartDependencies): AdaptiveUiPluginStart {
    return {};
  }

  stop() {}
}
