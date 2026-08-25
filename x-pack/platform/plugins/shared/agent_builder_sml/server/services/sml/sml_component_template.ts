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
 * How long a successful install is trusted before the next `ensure` re-puts the
 * component template. Re-putting is idempotent and repairs an out-of-band delete
 * or edit, so the index template's required component cannot stay missing until a
 * Kibana restart. Short enough to self-heal promptly, long enough to keep the
 * write path from issuing a cluster call on every document.
 */
const REVERIFY_INTERVAL_MS = 5 * 60_000;

/**
 * Memoized per schema version rather than per process, so a Kibana build with a
 * changed schema re-installs the component instead of trusting a stale install.
 * `verifiedAt` bounds how long a successful install is trusted; a rejected
 * promise is cleared by the `catch` so the next caller retries immediately.
 */
let installed: { version: string; verifiedAt: number; promise: Promise<void> } | undefined;

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
  const now = Date.now();

  // Concurrent callers within the interval share the same in-flight or recent
  // install; once the interval lapses the component is re-put so an out-of-band
  // deletion or edit self-heals rather than persisting until a restart.
  const isFresh =
    installed !== undefined &&
    installed.version === version &&
    now - installed.verifiedAt < REVERIFY_INTERVAL_MS;

  if (isFresh && installed !== undefined) {
    return installed.promise;
  }

  const entry: NonNullable<typeof installed> = {
    version,
    verifiedAt: now,
    promise: putComponentTemplate({ esClient, version }).catch((error) => {
      // Clear the memo so the next caller retries rather than inheriting a
      // permanently rejected promise; guard so a newer entry is not clobbered.
      if (installed === entry) {
        installed = undefined;
      }
      logger.error(
        `Failed to install component template ${smlMappingsComponentTemplateName}: ${
          (error as Error).message
        }`
      );
      throw error;
    }),
  };
  installed = entry;

  return entry.promise;
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
