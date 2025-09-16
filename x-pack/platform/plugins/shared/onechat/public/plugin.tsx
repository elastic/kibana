/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerAnalytics, registerApp, registerManagementSection } from './register';
import type { OnechatInternalService } from './services';
import { AgentService, ChatService, ConversationsService, ToolsService } from './services';
import { ConversationSettingsService } from './services/conversations/conversations_settings';
import { contentReferenceRegistry } from './application/components/conversations/content_reference/content_reference_registry';

import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { ONECHAT_FEATURE_ID, uiPrivileges } from '../common/features';

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  logger: Logger;
  private internalServices?: OnechatInternalService;
  private conversationSettingsService: ConversationSettingsService;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.conversationSettingsService = new ConversationSettingsService();
  }
  setup(
    core: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    deps: OnechatSetupDependencies
  ): OnechatPluginSetup {
    const isOnechatUiEnabled = core.uiSettings.get<boolean>(
      AGENT_BUILDER_ENABLED_SETTING_ID,
      false
    );

    if (isOnechatUiEnabled) {
      registerApp({
        core,
        getServices: () => {
          if (!this.internalServices) {
            throw new Error('getServices called before plugin start');
          }
          return this.internalServices;
        },
      });

      registerAnalytics({ analytics: core.analytics });
    }

    try {
      core.getStartServices().then(([coreStart]) => {
        const { capabilities } = coreStart.application;
        if (capabilities[ONECHAT_FEATURE_ID][uiPrivileges.showManagement]) {
          registerManagementSection({ core, management: deps.management });
        }
      });
    } catch (error) {
      this.logger.error('Error registering Agent Builder management section', error);
    }

    return {};
  }

  start({ http }: CoreStart, startDependencies: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const conversationSettingsService = this.conversationSettingsService.start();
    const toolsService = new ToolsService({ http });

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
      startDependencies,
      conversationSettingsService,
    };

    return {
      internalServices: this.internalServices,
      contentReferenceRegistry,
    };
  }

  stop() {
    this.conversationSettingsService.stop();
  }
}
