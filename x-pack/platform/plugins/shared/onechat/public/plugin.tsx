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
import { registerApp } from './register';
import {
  AgentService,
  ChatService,
  ConversationsService,
  OnechatInternalService,
  ToolsService,
  AgentProfilesService,
} from './services';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { ONECHAT_UI_SETTING_ID } from '../common/constants';

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
  setup(core: CoreSetup<OnechatStartDependencies, OnechatPluginStart>): OnechatPluginSetup {
    const isOnechatUiEnabled = core.uiSettings.get<boolean>(ONECHAT_UI_SETTING_ID, false);

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
    }
    return {};
  }

  start({ http }: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http });
    const agentProfilesService = new AgentProfilesService({ http });

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
      agentProfilesService,
    };

    return {};
  }
}
