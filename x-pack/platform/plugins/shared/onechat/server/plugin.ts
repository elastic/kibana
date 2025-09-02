/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { OnechatConfig } from './config';
import { ServiceManager } from './services';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
  OnechatRequestHandlerContext,
} from './types';
import { registerFeatures } from './features';
import { registerRoutes } from './routes';
import { registerUISettings } from './ui_settings';

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
    const { spaces: spacesSetup } = pluginsSetup;
    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
    });

    registerFeatures({ features: pluginsSetup.features });

    registerUISettings({ uiSettings: coreSetup.uiSettings });

    const router = coreSetup.http.createRouter<OnechatRequestHandlerContext>();

    // Register spaces context for route handlers
    coreSetup.http.registerRouteHandlerContext('onechat', async (_context, request) => {
      const [, { spaces }] = await coreSetup.getStartServices();

      const getSpaceId = (): string =>
        spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;

      return {
        spaces: {
          getSpaceId,
        },
      };
    });

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      pluginsSetup,
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
    { inference }: OnechatStartDependencies
  ): OnechatPluginStart {
    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      inference,
    });

    const { tools, agents, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    return {
      tools: {
        getRegistry: ({ request }) => tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
      agents: {
        getScopedClient: (args) => agents.getScopedClient(args),
        execute: async (args) => {
          return agents.execute(args);
        },
      },
    };
  }

  stop() {}
}
