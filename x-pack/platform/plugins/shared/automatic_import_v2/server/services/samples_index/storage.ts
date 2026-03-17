/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import type { InternalIStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

export const automaticImportSamplesIndexName = 'automatic-import-samples';

const HIDDEN_SETTING = { 'index.hidden': true } as const;

const automaticImportSamplesIndexAdapterSettings = {
  name: automaticImportSamplesIndexName,
  schema: {
    properties: {
      // ONLY map fields we actively search/filter/aggregate on
      integration_id: types.keyword({ ignore_above: 256 }),
      data_stream_id: types.keyword({ ignore_above: 256 }),
      created_by: types.keyword({ ignore_above: 256 }), // We can filter by this
      original_source: types.object({
        properties: {
          source_type: types.keyword({ ignore_above: 256 }),
          source_value: types.keyword({ ignore_above: 256 }),
        },
      }),
      // Non-searchable fields (stored but not indexed)
      log_data: types.text({ index: false }), // Log samples are stored but not indexed
      metadata: types.object({
        properties: {
          created_at: types.date({ index: false }),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export interface AutomaticImportSamplesProperties {
  integration_id: string;
  data_stream_id: string;
  created_by: string;
  original_source: {
    source_type: string; // 'index' | 'file'
    source_value: string;
  };
  log_data: string;
  metadata: {
    created_at: string;
  };
}

export type AutomaticImportSamplesIndexAdapterSettings =
  typeof automaticImportSamplesIndexAdapterSettings;

export type AutomaticImportSamplesIndexAdapter = StorageIndexAdapter<
  AutomaticImportSamplesIndexAdapterSettings,
  AutomaticImportSamplesProperties
>;

/**
 * Ensures the samples index template and current write index have index.hidden: true.
 * No-op if template or alias does not exist (e.g. 404).
 */
export async function ensureSamplesIndexHidden(esClient: ElasticsearchClient): Promise<void> {
  const templateName = automaticImportSamplesIndexName;
  const aliasName = automaticImportSamplesIndexName;

  try {
    const response = await esClient.indices.getIndexTemplate({ name: templateName });
    const indexTemplate = response.index_templates[0]?.index_template;
    if (indexTemplate?.template) {
      const template = indexTemplate.template;
      const mergedSettings = {
        ...(template.settings ?? {}),
        ...HIDDEN_SETTING,
      };
      await esClient.indices.putIndexTemplate({
        name: templateName,
        create: false,
        allow_auto_create: false,
        index_patterns: indexTemplate.index_patterns ?? [`${templateName}-*`],
        _meta: indexTemplate._meta,
        template: {
          ...template,
          settings: mergedSettings,
        },
      });
    }
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return;
    }
    throw error;
  }

  try {
    const aliases = await esClient.indices.getAlias({ name: aliasName });
    const writeIndexEntry = Object.entries(aliases).find(
      ([, alias]) => alias.aliases[aliasName]?.is_write_index === true
    );
    const writeIndexName = writeIndexEntry?.[0];
    if (writeIndexName) {
      await esClient.indices.putSettings({
        index: writeIndexName,
        body: HIDDEN_SETTING,
      });
    }
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return;
    }
    throw error;
  }
}

let ensureHiddenPromise: Promise<void> | null = null;

function getOrCreateEnsureHiddenPromise(esClient: ElasticsearchClient): Promise<void> {
  if (ensureHiddenPromise === null) {
    ensureHiddenPromise = ensureSamplesIndexHidden(esClient);
  }
  return ensureHiddenPromise;
}

export const createIndexAdapter = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AutomaticImportSamplesIndexAdapter => {
  const adapter = new StorageIndexAdapter<
    AutomaticImportSamplesIndexAdapterSettings,
    AutomaticImportSamplesProperties
  >(esClient, logger, automaticImportSamplesIndexAdapterSettings);

  const realClient = adapter.getClient();

  type ClientDocument = AutomaticImportSamplesProperties & { _id?: string };
  const wrappedClient: InternalIStorageClient<ClientDocument> = {
    ...realClient,
    bulk: async (request, transportOptions) => {
      const result = await realClient.bulk(request, transportOptions);
      await getOrCreateEnsureHiddenPromise(esClient);
      return result;
    },
    index: async (request, transportOptions) => {
      const result = await realClient.index(request, transportOptions);
      await getOrCreateEnsureHiddenPromise(esClient);
      return result;
    },
  };

  return {
    getClient: () => wrappedClient,
  } as AutomaticImportSamplesIndexAdapter;
};
