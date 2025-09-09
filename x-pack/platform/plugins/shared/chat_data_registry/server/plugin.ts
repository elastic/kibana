import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';
import { defineRoutes } from './routes';

export class ChatDataRegistryPlugin
  implements Plugin<ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('chatDataRegistry: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('chatDataRegistry: Started');
    return {};
  }

  public stop() {}
}
