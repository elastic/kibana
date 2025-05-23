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
import { ServiceManager } from './services';

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
  private serviceManager = new ServiceManager();

  constructor(context: PluginInitializerContext<OnechatConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    pluginsSetup: OnechatSetupDependencies
  ): OnechatPluginSetup {
    const serviceSetups = this.serviceManager.setupServices();

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      getInternalServices: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getInternalServices called before service init');
        }
        return services;
      },
    });

    return {
      tools: {
        register: serviceSetups.tools.register.bind(serviceSetups.tools),
      },
    };
  }

  start(
    { elasticsearch, security }: CoreStart,
    { actions, inference }: OnechatStartDependencies
  ): OnechatPluginStart {
    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      actions,
      inference,
    });

    const { tools, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    return {
      tools: {
        registry: tools.registry.asPublicRegistry(),
        execute: runner.runTool.bind(runner),
        asScoped: ({ request }) => {
          return {
            registry: tools.registry.asScopedPublicRegistry({ request }),
            execute: (args) => {
              return runner.runTool({ ...args, request });
            },
          };
        },
      },
    };
  }

  stop() {}
}
