/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ANONYMIZATION_PROFILES_INDEX } from '../../common';

/**
 * Elasticsearch mappings for the `.anonymization-profiles` system index.
 * See RFC Section 10.1 for the full schema.
 */
export const ANONYMIZATION_PROFILES_MAPPINGS = {
  dynamic: false as const,
  properties: {
    id: { type: 'keyword' as const },
    name: {
      type: 'text' as const,
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    description: { type: 'text' as const, analyzer: 'standard' },
    target_type: { type: 'keyword' as const },
    target_id: { type: 'keyword' as const },
    rules: {
      properties: {
        field_rules: {
          type: 'nested' as const,
          properties: {
            field: { type: 'keyword' as const },
            allowed: { type: 'boolean' as const },
            anonymized: { type: 'boolean' as const },
            entity_class: { type: 'keyword' as const },
          },
        },
        regex_rules: {
          type: 'nested' as const,
          properties: {
            id: { type: 'keyword' as const },
            type: { type: 'keyword' as const },
            entity_class: { type: 'keyword' as const },
            pattern: { type: 'text' as const, analyzer: 'standard' },
            enabled: { type: 'boolean' as const },
          },
        },
        ner_rules: {
          type: 'nested' as const,
          properties: {
            id: { type: 'keyword' as const },
            type: { type: 'keyword' as const },
            model_id: { type: 'keyword' as const },
            allowed_entity_classes: { type: 'keyword' as const },
            enabled: { type: 'boolean' as const },
          },
        },
      },
    },
    salt_id: { type: 'keyword' as const },
    created_at: { type: 'date' as const },
    updated_at: { type: 'date' as const },
    created_by: { type: 'keyword' as const },
    updated_by: { type: 'keyword' as const },
    namespace: { type: 'keyword' as const },
    migration: {
      properties: {
        ai_anonymization_settings: {
          properties: {
            applied_at: { type: 'date' as const },
          },
        },
      },
    },
  },
  _meta: {
    managed: true,
  },
};

export const ANONYMIZATION_PROFILES_SETTINGS = {
  hidden: true,
  auto_expand_replicas: '0-1',
  number_of_shards: 1,
  'index.mapping.ignore_malformed': true,
  'index.mapping.total_fields.limit': 2000,
};

/**
 * Ensures the `.anonymization-profiles` system index exists.
 * Idempotent: if the index already exists, this is a no-op.
 */
export const ensureProfilesIndex = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: ANONYMIZATION_PROFILES_INDEX });
    if (exists) {
      return;
    }

    await esClient.indices.create({
      index: ANONYMIZATION_PROFILES_INDEX,
      body: {
        settings: ANONYMIZATION_PROFILES_SETTINGS,
        mappings: ANONYMIZATION_PROFILES_MAPPINGS,
      },
    });

    logger.info(`Created system index: ${ANONYMIZATION_PROFILES_INDEX}`);
  } catch (err) {
    // Handle race condition where another node created the index concurrently
    if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      logger.debug(`System index already exists: ${ANONYMIZATION_PROFILES_INDEX}`);
      return;
    }
    throw err;
  }
};
