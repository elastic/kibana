/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AiIndexRegistry } from './registry';
import { AiIndexService } from './service';
import { isContextEngineEnabledInSpace } from '../utils/is_context_engine_enabled_in_space';

/** What the AI index service needs from Core at start; a subset both Kibana and a task pod provide. */
export type AiIndexCoreStart = Pick<CoreTasksStart, 'savedObjects' | 'uiSettings'>;

/**
 * Builds the AI index service with its managed bootstrap over the registry. The registry is filled
 * by `registerAiIndex` at setup, so it is empty in a runtime where no plugin registers into it.
 */
export const createAiIndexService = ({
  esClient,
  logger,
  registry,
  coreStart,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  registry: AiIndexRegistry;
  coreStart: AiIndexCoreStart;
}): AiIndexService => {
  const aiIndexService: AiIndexService = new AiIndexService({
    esClient,
    logger,
    managedBootstrap: {
      isManaged: (id) => registry.has(id),
      getManagedIds: () => registry.getManagedIds(),
      getRegistration: (id) => registry.get(id),
      ensure: async (id, spaceId) => {
        const enabled = await isContextEngineEnabledInSpace({
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          spaceId,
        });
        if (!enabled) {
          return false;
        }
        await registry.ensure({ id, spaceId, aiIndexService, logger });
        return true;
      },
    },
  });
  return aiIndexService;
};
