/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { OnechatConfig } from './config';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { registerRoutes } from './routes';
import {
  createServices,
  setupServices,
  startServices,
  type InternalServices,
  type InternalSetupServices,
  type InternalStartServices,
} from './services';

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  private logger: Logger;
  // @ts-expect-error unused for now
  private config: OnechatConfig;

  private services?: InternalServices;
  private serviceSetups?: InternalSetupServices;
  private serviceStarts?: InternalStartServices;

  constructor(context: PluginInitializerContext<OnechatConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    pluginsSetup: OnechatSetupDependencies
  ): OnechatPluginSetup {
    this.services = createServices();
    this.serviceSetups = setupServices({ services: this.services });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {
      tools: {
        register: this.serviceSetups!.tools.register.bind(this.serviceSetups!.tools),
      },
    };
  }

  start(core: CoreStart, pluginsStart: OnechatStartDependencies): OnechatPluginStart {
    if (!this.services) {
      throw new Error('#start called before #setup');
    }

    this.serviceStarts = startServices({ services: this.services });

    return {
      tools: {
        getScopedRegistry: (opts) => this.serviceStarts!.tools.public.asScoped(opts),
      },
    };
  }

  stop() {}
}
