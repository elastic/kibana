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
import { AgentService, ChatService, OnechatInternalService } from './services';
import { ONECHAT_FRAMEWORK_APP_ID, ONECHAT_PATH, ONECHAT_TITLE } from '../common/features';

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
  // @ts-expect-error unused for now
  private internalServices?: OnechatInternalService;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    pluginsSetup: OnechatSetupDependencies
  ): OnechatPluginSetup {
    coreSetup.application.register({
      id: ONECHAT_FRAMEWORK_APP_ID,
      appRoute: ONECHAT_PATH,
      category: DEFAULT_APP_CATEGORIES.chat,
      title: ONECHAT_TITLE,
      euiIconType: 'logoElasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, _depsStart] = await coreSetup.getStartServices();

        coreStart.chrome.docTitle.change(ONECHAT_TITLE);

        return renderApp({ core: coreStart, element, history });
      },
    });
    return {};
  }

  start({ http }: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });

    this.internalServices = {
      agentService,
      chatService,
    };

    /*
    // TODO: remove
    chatService
      .chat({
        conversationId: '4389bbb8-441e-4d08-9c7a-af4d0d7d63a2',
        nextMessage: 'What was my first message?',
      })
      .subscribe((event) => {
        console.log('**** event', event);
      });
     */

    return {};
  }
}
