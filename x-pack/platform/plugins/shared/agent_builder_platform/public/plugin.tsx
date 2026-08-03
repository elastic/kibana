/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  AgentBuilderPlatformPluginSetup,
  AgentBuilderPlatformPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { registerAttachmentUiDefinitions } from './attachment_types';

export class AgentBuilderPlatformPlugin
  implements
    Plugin<
      AgentBuilderPlatformPluginSetup,
      AgentBuilderPlatformPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderPlatformPluginSetup {
    return {};
  }

  start(coreStart: CoreStart, startDeps: PluginStartDependencies): AgentBuilderPlatformPluginStart {
    const { agentBuilder, share, triggersActionsUi, contextEngine } = startDeps;

    // Register the chat opener FIRST. Context Engine cannot depend on Agent Builder
    // (dependency cycle), so its UI opens chat through this registered fn. Doing it
    // before attachment registration guarantees a failure there can't block it.
    // eslint-disable-next-line no-console
    console.info(
      '[ce:chat-bridge] agent_builder_platform.start — contextEngine present:',
      Boolean(contextEngine)
    );
    contextEngine?.registerChatOpener((options) => {
      // eslint-disable-next-line no-console
      console.info('[ce:chat-bridge] openChat invoked via bridge');
      return agentBuilder.openChat(options as Parameters<typeof agentBuilder.openChat>[0]);
    });

    try {
      registerAttachmentUiDefinitions({
        attachments: agentBuilder.attachments,
        agents: agentBuilder.agents,
        locators: share.url.locators,
        core: coreStart,
        triggersActionsUi,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ce:chat-bridge] registerAttachmentUiDefinitions failed', error);
    }

    return {};
  }

  stop() {}
}
