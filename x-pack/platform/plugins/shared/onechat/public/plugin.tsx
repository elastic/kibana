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
import { ONECHAT_FEATURE_ID, uiPrivileges } from '../common/features';
import { docLinks } from '../common/doc_links';
import { registerAnalytics, registerApp, registerManagementSection } from './register';
import type { OnechatInternalService } from './services';
import {
  AgentService,
  ChatService,
  ConversationsService,
  OAuthManager,
  ToolsService,
} from './services';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { createPublicToolContract } from './services/tools';

import { registerLocators } from './locator/register_locators';

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

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
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
      registerLocators(deps.share);
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

  start(core: CoreStart, startDependencies: OnechatStartDependencies): OnechatPluginStart {
    const { http } = core;
    docLinks.setDocLinks(core.docLinks.links);

    const oauthManager = new OAuthManager(http, () => {
      // Get current user ID from security plugin
      // For now, use a placeholder until we integrate with security
      // TODO: Get actual user ID from core.security.authc.getCurrentUser()
      return 'default-user';
    });

    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http, oauthManager });

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
      oauthManager,
      startDependencies,
    };

    return {
      tools: createPublicToolContract({ toolsService }),
    };
  }
}
