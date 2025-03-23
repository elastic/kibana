/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

const ELASTICSEARCH_ASSET_TYPES = [
  'ingest_pipeline',
  'component_template',
  'index_template',
  'data_stream',
] as const;

type ElasticsearchAssetType = (typeof ELASTICSEARCH_ASSET_TYPES)[number];

export interface ElasticsearchAsset {
  type: ElasticsearchAssetType;
  id: string;
}

export const elasticsearchAssetSchema: z.Schema<ElasticsearchAsset> = z.object({
  type: z.enum(['ingest_pipeline', 'component_template', 'index_template', 'data_stream']),
  id: NonEmptyString,
});
