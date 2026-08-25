/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSchemaVersion } from '@kbn/storage-adapter';
import {
  AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
  agentMemoryMappingsComponentProperties,
  memoryStorageSettings,
} from './memory_storage';

let installed: { version: string; promise: Promise<void> } | undefined;

const putComponentTemplate = async ({
  esClient,
  version,
}: {
  esClient: ElasticsearchClient;
  version: string;
}): Promise<void> => {
  await esClient.cluster.putComponentTemplate({
    name: AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
    _meta: { managed: true, managed_by: 'agentMemory', version },
    template: {
      mappings: {
        properties: agentMemoryMappingsComponentProperties,
      },
    },
  });
};

export const ensureAgentMemoryMappingsComponentTemplate = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const version = getSchemaVersion(memoryStorageSettings);

  if (installed?.version !== version) {
    installed = {
      version,
      promise: putComponentTemplate({ esClient, version }).catch((error) => {
        installed = undefined;
        logger.error(
          `Failed to install component template ${AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE}: ${
            (error as Error).message
          }`
        );
        throw error;
      }),
    };
  }

  return installed.promise;
};

export const deleteAgentMemoryMappingsComponentTemplate = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<void> => {
  installed = undefined;
  await esClient.cluster.deleteComponentTemplate({
    name: AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
  });
};
