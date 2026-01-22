/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

export const automaticImportSamplesIndexName = 'automatic-import-samples';

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

export const createIndexAdapter = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AutomaticImportSamplesIndexAdapter => {
  return new StorageIndexAdapter<
    AutomaticImportSamplesIndexAdapterSettings,
    AutomaticImportSamplesProperties
  >(esClient, logger, automaticImportSamplesIndexAdapterSettings);
};
