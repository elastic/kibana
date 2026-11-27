/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  MAPPING_VERSION,
} from '../../../common/domain/entity_index';
import { createDataStream, putIndexTemplate } from '../../infra/elasticsearch';

export const RESOLUTION_RUNS_DATASET = 'resolution_runs' as const;

/** How long run records are kept (decision 23: 30 days). */
export const RESOLUTION_RUNS_RETENTION = '30d';

/**
 * The stream name starts with `.entities.v2.`, so the index patterns that existing Security roles
 * already grant for entity store indices cover it.
 */
export const getResolutionRunsDataStreamName = (namespace: string) =>
  `.${ENTITY_BASE_PREFIX}.${ENTITY_SCHEMA_VERSION_V2}.${RESOLUTION_RUNS_DATASET}.${namespace}` as const;

export const getResolutionRunsIndexTemplateId = (namespace: string) =>
  `${getResolutionRunsDataStreamName(namespace)}_index_template` as const;

export const getResolutionRunsIndexTemplateConfig = (
  namespace: string
): IndicesPutIndexTemplateRequest => ({
  name: getResolutionRunsIndexTemplateId(namespace),
  _meta: {
    description:
      'Index template for the resolution runs data stream. ' +
      'Stores one record per run of an automated resolution rule.',
    managed: true,
    managed_by: 'security_context_core_analysis',
  },
  index_patterns: [getResolutionRunsDataStreamName(namespace)],
  priority: 200,
  data_stream: {},
  template: {
    lifecycle: {
      data_retention: RESOLUTION_RUNS_RETENTION,
    },
    mappings: {
      _meta: { mappingsVersion: MAPPING_VERSION },
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        rule: {
          properties: {
            id: { type: 'keyword' },
            kind: { type: 'keyword' },
          },
        },
        event: {
          properties: {
            // `success` or `failure`
            outcome: { type: 'keyword' },
          },
        },
        error: {
          properties: {
            message: { type: 'keyword', ignore_above: 1024 },
          },
        },
        resolution: {
          properties: {
            links_created: { type: 'long' },
            skipped_ambiguous: { type: 'long' },
            skipped_oversized: { type: 'long' },
            skipped_noop: { type: 'long' },
          },
        },
      },
    },
    settings: {
      index: {
        codec: 'best_compression',
      },
    },
  },
});

/**
 * Makes sure the template and the data stream exist, and does nothing when they already do.
 * It must run before the first write: a write to a name with no template makes Elasticsearch
 * create a plain index that then takes the data stream's name.
 */
export const ensureResolutionRunsDataStream = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  await putIndexTemplate(esClient, getResolutionRunsIndexTemplateConfig(namespace));
  await createDataStream(esClient, getResolutionRunsDataStreamName(namespace), {
    throwIfExists: false,
  });
  logger.debug(`ensured resolution runs data stream in ${namespace}`);
};
