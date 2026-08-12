/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
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

    // Context Engine ↔ Agent Builder bridge (browser half): wire the CE "Analyze & improve" opener
    // to Agent Builder's `openChat`. `context_engine` never imports `agentBuilder` — it exposes
    // `buildAnalyzeChat` (which owns the attachment wire contract + per-index conversation scoping)
    // and this bridge forwards its result. Registration is gated on the user's `agentBuilder.show`
    // capability so the CE button never appears for users who can't use Agent Builder; the opener
    // additionally checks runtime access (license + LLM connector) at click time.
    if (contextEngine && coreStart.application.capabilities.agentBuilder?.show === true) {
      contextEngine.registerChatOpener(async (ctx) => {
        const access = await agentBuilder.getAgentBuilderAccess();
        if (!access.hasRequiredLicense || !access.hasLlmConnector) {
          coreStart.notifications.toasts.addWarning({
            title: i18n.translate('xpack.agentBuilderPlatform.chatBridge.noAccessTitle', {
              defaultMessage: 'Agent Builder is not available',
            }),
            text: i18n.translate('xpack.agentBuilderPlatform.chatBridge.noAccessText', {
              defaultMessage:
                'Analyzing signals requires an enterprise license and a configured LLM connector.',
            }),
          });
          return;
        }
        const options = contextEngine.buildAnalyzeChat(ctx);
        // No configured feedback agent → nothing to open against (the button is gated on this too).
        if (!options.agentId) {
          return;
        }
        agentBuilder.openChat(options);
      });
    }

    registerAttachmentUiDefinitions({
      attachments: agentBuilder.attachments,
      agents: agentBuilder.agents,
      locators: share.url.locators,
      core: coreStart,
      triggersActionsUi,
    });

    return {};
  }

  stop() {}
}
