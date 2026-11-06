/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { LoggingSystem } from '@kbn/core-logging-server-internal';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import {
  AgentManager,
  ClusterClient,
  getRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';
import type { TaskHost } from '../task_type_module';

export interface StandaloneHostOptions {
  elasticsearch: ElasticsearchClientConfig;
  kibanaVersion: string;
  savedObjectTypes?: SavedObjectsType[];
}

export interface StandaloneHost {
  host: TaskHost;
  stop(): Promise<void>;
}

const createSavedObjects = ({
  types,
  client,
  logger,
  kibanaVersion,
}: {
  types: SavedObjectsType[];
  client: ClusterClient['asInternalUser'];
  logger: Logger;
  kibanaVersion: string;
}): TaskHost['savedObjects'] => {
  if (types.length === 0) {
    return {
      createInternalRepository: () => {
        throw new Error(
          'This task type uses saved objects but declares no savedObjectTypes; add the types it reads or writes'
        );
      },
    };
  }

  const typeRegistry = new SavedObjectTypeRegistry();
  types.forEach((type) => typeRegistry.registerType(type));

  const migrator = new KibanaMigrator({
    client,
    typeRegistry,
    hashToVersionMap: {},
    // Only what the constructor path reads: a task process never runs a migration.
    soMigrationsConfig: { batchSize: 1000 } as never,
    kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
    kibanaVersion,
    logger,
    docLinks: {} as never,
    waitForMigrationCompletion: false,
    nodeRoles: { backgroundTasks: true, ui: false, migrator: false } as never,
    esCapabilities: {} as never,
  });
  // Builds the active migrations from the registry without touching Elasticsearch. Without it,
  // reading a document throws.
  migrator.prepareMigrations();

  return {
    createInternalRepository: (includedHiddenTypes = [], extensions) =>
      SavedObjectsRepository.createRepository(
        migrator,
        typeRegistry,
        MAIN_SAVED_OBJECT_INDEX,
        client,
        logger,
        // Types of other plugins do not exist here.
        includedHiddenTypes.filter((type) => typeRegistry.getType(type) !== undefined),
        extensions
      ),
  };
};

/**
 * What a task type module gets in a process of its own: Core's logging system, Core's own
 * Elasticsearch `ClusterClient`, and, for a module that declares saved object types, Core's
 * saved objects repository. No plugins, no HTTP server, no migrations.
 */
export const createStandaloneHost = async ({
  elasticsearch,
  kibanaVersion,
  savedObjectTypes = [],
}: StandaloneHostOptions): Promise<StandaloneHost> => {
  const loggingSystem = new LoggingSystem();
  await loggingSystem.upgrade();
  const logger = loggingSystem.get('task-process');

  const esLogger = loggingSystem.get('elasticsearch');
  const agentManager = new AgentManager(esLogger.get('agent-manager'), {
    dnsCacheTtlInSeconds: elasticsearch.dnsCacheTtl?.asSeconds() ?? 0,
  });
  const client = new ClusterClient({
    config: elasticsearch,
    logger: esLogger,
    type: 'data',
    agentFactoryProvider: agentManager,
    kibanaVersion,
    onRequestHandlerFactory: getRequestHandlerFactory(false),
  });

  const savedObjects = createSavedObjects({
    types: savedObjectTypes,
    client: client.asInternalUser,
    logger: loggingSystem.get('savedobjects-service'),
    kibanaVersion,
  });

  return {
    host: {
      logger,
      elasticsearch: {
        asInternalUser: client.asInternalUser,
        asScoped: client.asScoped.bind(client),
      },
      savedObjects,
    },
    stop: async () => {
      await client.close();
      await loggingSystem.stop();
    },
  };
};
