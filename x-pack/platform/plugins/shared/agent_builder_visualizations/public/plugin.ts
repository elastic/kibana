/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import { ADD_TO_CHAT_ACTION_ID } from '@kbn/embeddable-plugin/public';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createAddToChatProviderRegistry } from './add_to_chat';
import { createVisualizationAttachmentDefinition } from './attachment_types/visualization_attachment';
import type {
  AgentBuilderVisualizationsPluginPublicSetup,
  AgentBuilderVisualizationsPluginPublicStart,
  AgentBuilderVisualizationsPluginPublicSetupDependencies,
  AgentBuilderVisualizationsPluginPublicStartDependencies,
} from './types';

export class AgentBuilderVisualizationsPublicPlugin
  implements
    Plugin<
      AgentBuilderVisualizationsPluginPublicSetup,
      AgentBuilderVisualizationsPluginPublicStart,
      AgentBuilderVisualizationsPluginPublicSetupDependencies,
      AgentBuilderVisualizationsPluginPublicStartDependencies
    >
{
  constructor(_initContext: PluginInitializerContext) {}

  setup(
    _core: CoreSetup<
      AgentBuilderVisualizationsPluginPublicStartDependencies,
      AgentBuilderVisualizationsPluginPublicStart
    >,
    _plugins: AgentBuilderVisualizationsPluginPublicSetupDependencies
  ): AgentBuilderVisualizationsPluginPublicSetup {
    return {};
  }

  start(
    core: CoreStart,
    plugins: AgentBuilderVisualizationsPluginPublicStartDependencies
  ): AgentBuilderVisualizationsPluginPublicStart {
    plugins.agentBuilder.attachments.addAttachmentType(
      VISUALIZATION_ATTACHMENT_TYPE,
      createVisualizationAttachmentDefinition({
        application: core.application,
        lens: plugins.lens,
        dataViews: plugins.dataViews,
        uiActions: plugins.uiActions,
        unifiedSearch: plugins.unifiedSearch,
        embeddable: plugins.embeddable,
        customContent: {
          http: core.http,
          uiSettings: core.uiSettings,
          search: plugins.data.search.search,
        },
      })
    );

    const addToChatProviders = createAddToChatProviderRegistry();
    if (core.application.capabilities.agentBuilder?.show === true) {
      plugins.uiActions.registerActionAsync(ADD_TO_CHAT_ACTION_ID, async () => {
        const { createAddToChatAction } = await import('./add_to_chat/add_to_chat_action');
        return createAddToChatAction({
          agentBuilder: plugins.agentBuilder,
          analytics: core.analytics,
          providers: addToChatProviders,
        });
      });
      plugins.uiActions.attachAction(ON_OPEN_PANEL_MENU, ADD_TO_CHAT_ACTION_ID);
    }

    return { addToChat: { registerProvider: addToChatProviders.register } };
  }

  stop() {}
}
