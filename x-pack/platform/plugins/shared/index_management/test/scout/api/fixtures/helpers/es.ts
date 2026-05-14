/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { EsClient, ScoutLogger } from '@kbn/scout';

import type { TemplateDeserialized, TemplateSerialized } from '../../../../../common';
import { INDEX_PATTERNS } from '../constants';

type TestTemplateDeserialized = TemplateDeserialized & {
  template: NonNullable<TemplateDeserialized['template']>;
};

export const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase();

export const deleteIndices = async (esClient: EsClient, indices: string[], log?: ScoutLogger) => {
  if (indices.length === 0) {
    return;
  }

  const batches = indices.join(',').length > 3000 ? indices.map((index) => [index]) : [indices];

  for (const batch of batches) {
    await esClient.indices
      .delete({ index: batch, ignore_unavailable: true, allow_no_indices: true })
      .catch((error) => {
        log?.debug(`[Cleanup error] Error deleting indices: ${error.message}`);
      });
  }
};

export const createIndex = async ({
  esClient,
  index,
  mappings,
  settings,
}: {
  esClient: EsClient;
  index?: string;
  mappings?: MappingTypeMapping;
  settings?: IndicesIndexSettings;
}) => {
  const indexName = index ?? uniqueName('index-management');
  await esClient.indices.create({ index: indexName, mappings, settings });
  return indexName;
};

export const createDataStream = async ({
  esClient,
  name,
  indexMode,
}: {
  esClient: EsClient;
  name: string;
  indexMode?: string;
}) => {
  await esClient.indices.putIndexTemplate({
    name,
    index_patterns: [`${name}*`],
    template: {
      mappings: {
        properties: {
          '@timestamp': {
            type: 'date',
          },
        },
      },
      settings: {
        index: {
          mode: indexMode,
        },
      },
      lifecycle: {
        enabled: true,
      },
    },
    data_stream: {},
  });

  await esClient.indices.createDataStream({ name });
};

export const deleteDataStream = async (esClient: EsClient, name: string, log?: ScoutLogger) => {
  await esClient.indices.deleteDataStream({ name }).catch((error) => {
    log?.debug(`[Cleanup error] Error deleting data stream ${name}: ${error.message}`);
  });
  await esClient.indices.deleteIndexTemplate({ name }).catch((error) => {
    log?.debug(`[Cleanup error] Error deleting index template ${name}: ${error.message}`);
  });
};

export const putComponentTemplate = async ({
  esClient,
  name,
  template = {
    mappings: {
      properties: {
        host_name: {
          type: 'keyword',
        },
      },
    },
  },
}: {
  esClient: EsClient;
  name: string;
  template?: ClusterPutComponentTemplateRequest['template'];
}) => {
  await esClient.cluster.putComponentTemplate({ name, template });
};

export const getTemplatePayload = (
  name: string,
  indexPatterns: string[] = INDEX_PATTERNS,
  isLegacy = false,
  isMappingsSourceFieldEnabled = true
): TestTemplateDeserialized => {
  const template = {
    settings: {
      number_of_shards: 1,
    },
    mappings: {
      ...(isMappingsSourceFieldEnabled ? { _source: { enabled: false } } : {}),
      properties: {
        host_name: {
          type: 'keyword',
        },
        created_at: {
          type: 'date',
          format: 'EEE MMM dd HH:mm:ss Z yyyy',
        },
      },
    },
    aliases: {
      alias1: {},
    },
  };

  return {
    name,
    indexPatterns,
    version: 1,
    template,
    _kbnMeta: {
      isLegacy,
      type: 'default',
      hasDatastream: false,
    },
    allowAutoCreate: 'NO_OVERWRITE',
    ...(isLegacy ? { order: 1 } : { priority: 1 }),
  } as TestTemplateDeserialized;
};

export const getSerializedTemplate = (
  indexPatterns: string[] = INDEX_PATTERNS,
  isMappingsSourceFieldEnabled = true
): TemplateSerialized => ({
  index_patterns: indexPatterns,
  template: getTemplatePayload('unused', indexPatterns, false, isMappingsSourceFieldEnabled)
    .template,
});

export const createEnrichPolicy = async ({
  esClient,
  policyName,
  indexName,
}: {
  esClient: EsClient;
  policyName: string;
  indexName: string;
}) => {
  await esClient.enrich.putPolicy({
    name: policyName,
    match: {
      match_field: 'email',
      enrich_fields: ['firstName'],
      indices: [indexName],
    },
  });
};

export const createEnrichIndex = async (esClient: EsClient, indexName: string) => {
  await esClient.indices.create({
    index: indexName,
    mappings: {
      properties: {
        email: {
          type: 'text',
        },
        firstName: {
          type: 'text',
        },
      },
    },
  });
};

export const resetLogsdbClusterSettings = async (esClient: EsClient) => {
  await esClient.cluster.putSettings({
    persistent: {
      cluster: {
        logsdb: {
          enabled: null,
        },
      },
      logsdb: {
        prior_logs_usage: null,
      },
    },
  });
};
