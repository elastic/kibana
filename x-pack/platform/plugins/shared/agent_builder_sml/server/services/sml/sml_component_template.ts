/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSchemaVersion } from '@kbn/storage-adapter';
import {
  smlMappingsComponentProperties,
  smlMappingsComponentTemplateName,
  storageSettings,
} from './sml_storage';

/**
 * Memoized per schema version rather than per process, so a Kibana build with a
 * changed schema re-installs the component instead of trusting a stale install.
 */
let installed: { version: string; promise: Promise<void> } | undefined;

const putComponentTemplate = async ({
  esClient,
  version,
}: {
  esClient: ElasticsearchClient;
  version: string;
}): Promise<void> => {
  await esClient.cluster.putComponentTemplate({
    name: smlMappingsComponentTemplateName,
    _meta: { managed: true, managed_by: 'agentBuilderSml', version },
    template: {
      mappings: {
        properties: smlMappingsComponentProperties,
      },
    },
  });
};

/**
 * Installs the component template carrying SML's own fields. Must complete before
 * the storage adapter writes its index template, which references the component
 * without `ignore_missing_component_templates`.
 */
export const ensureSmlMappingsComponentTemplate = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const version = getSchemaVersion(storageSettings);

  if (installed?.version !== version) {
    installed = {
      version,
      promise: putComponentTemplate({ esClient, version }).catch((error) => {
        // Clear the memo so the next caller retries rather than inheriting a
        // permanently rejected promise.
        installed = undefined;
        logger.error(
          `Failed to install component template ${smlMappingsComponentTemplateName}: ${
            (error as Error).message
          }`
        );
        throw error;
      }),
    };
  }

  return installed.promise;
};

/** Removes the component template and resets the memo. For tests and tooling. */
export const deleteSmlMappingsComponentTemplate = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<void> => {
  installed = undefined;
  await esClient.cluster.deleteComponentTemplate({
    name: smlMappingsComponentTemplateName,
  });
};
