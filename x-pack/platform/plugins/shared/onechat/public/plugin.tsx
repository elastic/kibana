/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
// import { ConversationalAgentParams } from '@kbn/onechat-server';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { AgentService, OnechatInternalService } from './services';

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
    return {};
  }

  start({ http }: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    const agentService = new AgentService({ http });

    this.internalServices = {
      agentService,
    };

    // TODO: remove
    /*
    const agentParams: ConversationalAgentParams = {
      nextInput: { message: 'Hello ?' },
    };
    agentService
      .stream({
        agentId: 'onechat_default',
        agentParams: agentParams as Record<string, any>,
      })
      .subscribe((event) => {
        console.log('**** event', event);
      });
    */
    // TODO: end

    return {};
  }
}
