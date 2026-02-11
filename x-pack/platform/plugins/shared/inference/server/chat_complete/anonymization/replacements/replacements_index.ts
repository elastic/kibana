/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * System index name for anonymization replacements.
 * Uses `.kibana-` prefix so that `kibana_system` role has access.
 */
export const ANONYMIZATION_REPLACEMENTS_INDEX = '.kibana-anonymization-replacements';

/**
 * Elasticsearch mappings for the `.kibana-anonymization-replacements` system index.
 * See RFC Section 10.2 for the full schema.
 */
export const ANONYMIZATION_REPLACEMENTS_MAPPINGS = {
  dynamic: false as const,
  properties: {
    id: { type: 'keyword' as const },
    scope_type: { type: 'keyword' as const },
    scope_id: { type: 'keyword' as const },
    profile_id: { type: 'keyword' as const },
    token_to_original: { type: 'flattened' as const },
    token_sources: {
      type: 'nested' as const,
      properties: {
        token: { type: 'keyword' as const },
        pointer: { type: 'keyword' as const },
        entity_class: { type: 'keyword' as const },
        source_type: { type: 'keyword' as const },
        source_id: { type: 'keyword' as const },
        span_start: { type: 'integer' as const },
        span_end: { type: 'integer' as const },
        field: { type: 'keyword' as const },
        field_ref: { type: 'keyword' as const },
        rule_type: { type: 'keyword' as const },
        rule_id: { type: 'keyword' as const },
        first_seen_at: { type: 'date' as const },
      },
    },
    created_at: { type: 'date' as const },
    updated_at: { type: 'date' as const },
    created_by: { type: 'keyword' as const },
    namespace: { type: 'keyword' as const },
  },
  _meta: {
    managed: true,
  },
};

export const ANONYMIZATION_REPLACEMENTS_SETTINGS = {
  hidden: true,
  auto_expand_replicas: '0-1',
  number_of_shards: 1,
  'index.mapping.ignore_malformed': true,
  'index.mapping.total_fields.limit': 2000,
};

/**
 * Ensures the `.kibana-anonymization-replacements` system index exists.
 * Idempotent: if the index already exists, this is a no-op.
 */
export const ensureReplacementsIndex = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: ANONYMIZATION_REPLACEMENTS_INDEX });
    if (exists) {
      return;
    }

    await esClient.indices.create({
      index: ANONYMIZATION_REPLACEMENTS_INDEX,
      settings: ANONYMIZATION_REPLACEMENTS_SETTINGS,
      mappings: ANONYMIZATION_REPLACEMENTS_MAPPINGS,
    });

    logger.info(`Created system index: ${ANONYMIZATION_REPLACEMENTS_INDEX}`);
  } catch (err) {
    if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      logger.debug(`System index already exists: ${ANONYMIZATION_REPLACEMENTS_INDEX}`);
      return;
    }
    throw err;
  }
};
