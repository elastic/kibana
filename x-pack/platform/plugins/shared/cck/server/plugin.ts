import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginConfigDescriptor,
} from '@kbn/core/server';

import type { CckPluginContract, CckPluginSetup, CckPluginStart } from './types';
import { defineRoutes } from './routes';
import { CckConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { getCCKClient, getMultiCCKClient } from './client';

export const config: PluginConfigDescriptor<CckConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class CckPlugin implements Plugin<CckPluginSetup, CckPluginStart> {
  private readonly logger: Logger;
  private config: CckConfig;

  constructor(initializerContext: PluginInitializerContext<CckConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<CckConfig>();
  }

  private getContract(): CckPluginContract {
    return {
      getServers: () =>
        this.config.servers.map((server) => ({
          name: server.name,
          endpoint: server.endpoint,
        })),
      getCCKClient: (name: string) => {
        const server = this.config.servers.find((s) => s.name === name);
        if (!server) {
          throw new Error(`Server with name ${name} not found`);
        }
        return getCCKClient(server);
      },
      getMultiCCKClient: (servers?: string[]) => {
        const serverConfig = servers
          ? this.config.servers.filter((server) => servers.includes(server.name))
          : this.config.servers;
        return getMultiCCKClient(serverConfig);
      },
    };
  }

  public setup(core: CoreSetup) {
    this.logger.debug('cck: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.config);

    return this.getContract();
  }

  public start(core: CoreStart) {
    this.logger.debug('cck: Started');
    return this.getContract();
  }

  public stop() {}
}
