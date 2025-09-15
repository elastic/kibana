/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { EntityManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { EntityClient } from './lib/entity_client';
import { entityManagerRouteRepository } from './routes';
import { EntityManagerRouteDependencies } from './routes/types';
import { EntityDiscoveryApiKeyType, entityDefinition } from './saved_objects';
import {
  EntityManagerPluginSetupDependencies,
  EntityManagerPluginStartDependencies,
  EntityManagerServerSetup,
} from './types';
import { disableManagedEntityDiscovery } from './lib/entities/uninstall_entity_definition';
import { installEntityManagerTemplates } from './lib/manage_index_templates';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerServerPluginSetup {}
export interface EntityManagerServerPluginStart {
  getScopedClient: (options: { request: KibanaRequest }) => Promise<EntityClient>;
}

export const config: PluginConfigDescriptor<EntityManagerConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class EntityManagerServerPlugin
  implements
    Plugin<
      EntityManagerServerPluginSetup,
      EntityManagerServerPluginStart,
      EntityManagerPluginSetupDependencies,
      EntityManagerPluginStartDependencies
    >
{
  public config: EntityManagerConfig;
  public logger: Logger;
  public server?: EntityManagerServerSetup;

  constructor(context: PluginInitializerContext<EntityManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: EntityManagerPluginSetupDependencies
  ): EntityManagerServerPluginSetup {
    core.savedObjects.registerType(entityDefinition);
    core.savedObjects.registerType(EntityDiscoveryApiKeyType);
    plugins.encryptedSavedObjects.registerType({
      type: EntityDiscoveryApiKeyType.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    this.server = {
      config: this.config,
      logger: this.logger,
    } as EntityManagerServerSetup;

    registerRoutes<EntityManagerRouteDependencies>({
      repository: entityManagerRouteRepository,
      dependencies: {
        server: this.server,
        getScopedClient: async ({ request }: { request: KibanaRequest }) => {
          const [coreStart] = await core.getStartServices();
          return this.getScopedClient({ request, coreStart });
        },
      },
      core,
      logger: this.logger,
    });

    return {};
  }

  private async getScopedClient({
    request,
    coreStart,
  }: {
    request: KibanaRequest;
    coreStart: CoreStart;
  }) {
    const clusterClient = coreStart.elasticsearch.client.asScoped(request);
    const soClient = coreStart.savedObjects.getScopedClient(request);
    return new EntityClient({ clusterClient, soClient, logger: this.logger });
  }

  public start(
    core: CoreStart,
    plugins: EntityManagerPluginStartDependencies
  ): EntityManagerServerPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
    }

    // Setup v1 definitions index
    installEntityManagerTemplates({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger,
    }).catch((err) => this.logger.error(err));

    // Disable v1 built-in definitions.
    // the api key invalidation requires a check against the cluster license
    // which is lazily loaded. we ensure it gets loaded before the update
    firstValueFrom(plugins.licensing.license$)
      .then(() => disableManagedEntityDiscovery({ server: this.server! }))
      .then(() => this.logger.info(`Disabled managed entity discovery`))
      .catch((err) => this.logger.error(`Failed to disable managed entity discovery: ${err}`));

    return {
      getScopedClient: async ({ request }: { request: KibanaRequest }) => {
        return this.getScopedClient({ request, coreStart: core });
      },
    };
  }

  public stop() {}
}
