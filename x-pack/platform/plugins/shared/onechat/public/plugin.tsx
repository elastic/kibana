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
import { visualizationElement } from '@kbn/onechat-common/tools/tool_result';

import { ONECHAT_FEATURE_ID, uiPrivileges } from '../common/features';
import { docLinks } from '../common/doc_links';
import { createVisualizationRenderer } from './application/components/conversations/conversation_rounds/markdown_plugins';
import { registerLocators } from './locator/register_locators';
import { registerAnalytics, registerApp, registerManagementSection } from './register';
import type { OnechatInternalService } from './services';
import { AgentService, ChatService, ConversationsService, ToolsService } from './services';
import { ElementRegistry } from './services/element_registry';
import { createPublicToolContract } from './services/tools';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';

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
  private elementRegistry: ElementRegistry;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.elementRegistry = new ElementRegistry(this.logger);
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

    // Register built-in visualization element
    this.elementRegistry.register({
      tagName: visualizationElement.tagName,
      attributes: visualizationElement.attributes,
      rendererFactory: (context) =>
        createVisualizationRenderer({
          startDependencies: context.startDependencies,
          stepsFromCurrentRound: context.stepsFromCurrentRound,
          stepsFromPrevRounds: context.stepsFromPrevRounds,
        }),
    });

    return {
      elementRegistry: {
        registerCustomElement: (config) => this.elementRegistry.register(config),
      },
    };
  }

  start(core: CoreStart, startDependencies: OnechatStartDependencies): OnechatPluginStart {
    const { http } = core;
    docLinks.setDocLinks(core.docLinks.links);

    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http });

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
      elementRegistry: this.elementRegistry,
      startDependencies,
    };

    return {
      tools: createPublicToolContract({ toolsService }),
    };
  }
}
