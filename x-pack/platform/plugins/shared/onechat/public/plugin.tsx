/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import {
  AgentService,
  ChatService,
  ConversationsService,
  ToolsService,
  OnechatInternalService,
} from './services';
import { ONECHAT_APP_ID, ONECHAT_PATH, ONECHAT_TITLE } from '../common/features';
import { ONECHAT_CHAT_UI_SETTING_ID } from '../common/constants';

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
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    pluginsSetup: OnechatSetupDependencies
  ): OnechatPluginSetup {
    const getServices = () => {
      if (!this.internalServices) {
        throw new Error('getServices called before plugin start');
      }
      return this.internalServices;
    };

    const isOnechatEnabled = coreSetup.uiSettings.get<boolean>(ONECHAT_CHAT_UI_SETTING_ID, false);
    if (isOnechatEnabled) {
      coreSetup.application.register({
        id: ONECHAT_APP_ID,
        appRoute: ONECHAT_PATH,
        category: DEFAULT_APP_CATEGORIES.chat,
        title: ONECHAT_TITLE,
        euiIconType: 'logoElasticsearch',
        visibleIn: ['sideNav', 'globalSearch'],
        deepLinks: [{ id: 'chat', path: '/chat', title: 'Chat' }],
        async mount({ element, history }: AppMountParameters) {
          const { renderApp } = await import('./application');
          const [coreStart, startPluginDeps] = await coreSetup.getStartServices();

          coreStart.chrome.docTitle.change(ONECHAT_TITLE);
          const services = getServices();

          return renderApp({
            core: coreStart,
            services,
            element,
            history,
            plugins: startPluginDeps,
          });
        },
      });
    }

    return {};
  }

  start({ http }: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http });

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
    };

    return {};
  }
}
