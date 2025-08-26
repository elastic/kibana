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
import { ONECHAT_UI_SETTING_ID } from '../common/constants';
import { registerAnalytics, registerApp } from './register';
import type { OnechatInternalService } from './services';
import {
  AgentService,
  ChatService,
  ConversationsService,
  ToolsService,
  DataTypeRegistry,
} from './services';
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
  private readonly dataTypeRegistry = new DataTypeRegistry();

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup<OnechatStartDependencies, OnechatPluginStart>): OnechatPluginSetup {
    const isOnechatUiEnabled = core.uiSettings.get<boolean>(ONECHAT_UI_SETTING_ID, false);
    this.logger.info(`Onechat UI setting is ${isOnechatUiEnabled ? 'enabled' : 'disabled'}`);

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

      return {
        dataTypeRegistry: {
          register: (descriptor) => this.dataTypeRegistry.register(descriptor),
          list: () => this.dataTypeRegistry.list(),
          clear: () => this.dataTypeRegistry.clear(),
        },
      };
    }

    return {
      dataTypeRegistry: {
        register: () => {},
        list: () => {
          return [] as string[];
        },
        clear: () => {},
      },
    };
  }

  start({ http }: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http });
    const dataTypeRegistry = this.dataTypeRegistry;

    this.internalServices = {
      agentService,
      chatService,
      conversationsService,
      toolsService,
      dataTypeRegistry,
    };

    return {};
  }
}
