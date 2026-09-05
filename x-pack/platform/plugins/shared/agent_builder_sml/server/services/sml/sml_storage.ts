/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SmlDocument } from './types';

export const smlIndexName = 'ai-index-idx-sml-data';

/**
 * Plain description of what this index holds. Shared by the Context Engine AI index registration
 * and the Agent Builder system prompt, so the two cannot drift apart.
 */
export const smlAiIndexDescription =
  'Kibana resources available for use in Agent Builder, including dashboards, visualizations, ' +
  'connectors, workflows, alerting rules, action policies, and significant events.';

const SEMANTIC_MULTI_FIELD = {
  semantic: types.semantic_text({}),
};

/**
 * Single source of truth for SML data index field mappings (storage + Elasticsearch).
 *
 * Each text source field carries a `semantic` multi-field (`title.semantic`,
 * `description.semantic`, `content.semantic`) so the RRF retriever can address
 * them independently without a separate top-level field or `copy_to`.
 */
const smlStorageSchemaProperties = {
  id: types.keyword({}),
  type: types.keyword({}),
  title: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  origin: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  content: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  description: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  tags: types.keyword({ normalizer: 'lowercase' }),
  /**
   * Autocomplete surface. The indexer auto-prepends two entries on every record:
   *   { value: entry.title, kind: 'title' }
   *   { value: entry.type,  kind: 'type'  }
   * plus any entries the producer provides (taglines, nicknames, categories, etc.).
   * The @ menu queries `discovery_labels.value` with `multi_match bool_prefix`
   * (SAYT's native query type) and reads `inner_hits` to render which entry
   * matched, with `kind`-driven UI badging.
   *
   * `discovery_labels.value` is `search_as_you_type`. ES auto-generates the
   * `_2gram`, `_3gram`, and `_index_prefix` subfields used by `bool_prefix`.
   *
   * Known limitation: ES does not produce useful highlight snippets for
   * SAYT + `bool_prefix` queries in a nested context (bug
   * elastic/elasticsearch#53744, open since 2020). `matched_discovery_labels`
   * entries are returned without `highlighted`; the UI falls back to rendering
   * plain `value` for those entries.
   */
  discovery_labels: types.nested({
    properties: {
      value: types.search_as_you_type({}),
      kind: types.keyword({}),
    },
  }),
  references: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  extended_attrs: types.flattened({}),
  user_id: types.keyword({}),
  created_at: types.date({}),
  updated_at: types.date({}),
  permissions: types.object({
    properties: {
      kibana: types.object({
        properties: {
          /**
           * One element per space, each listing the actions that space requires plus a count of
           * them.
           *
           * Caveat: ES|QL cannot read `nested` leaves (its index resolution filters them out), so
           * the read path authorizes via a `nested` Query DSL filter pushed into the `_query`
           * `filter` parameter rather than a WHERE clause or a projected column.
           */
          privileges: types.nested({
            properties: {
              name: types.keyword({}),
              space: types.keyword({}),
              count: types.long({}),
            },
          }),
        },
      }),
    },
  }),
  ingestion_method: types.keyword({}),
};

export const storageSettings = {
  name: smlIndexName,
  /**
   * Ensure the SML backing index name has a higher priority than built-in AI index templates.
   */
  priority: 600,
  schema: {
    properties: smlStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

/**
 * Elasticsearch `mappings` block for the SML data index (e.g. integration tests, tooling).
 * Field definitions match `smlStorageSchemaProperties` / `storageSettings`.
 */
export const smlElasticsearchIndexMappings = {
  dynamic: 'strict' as const,
  properties: smlStorageSchemaProperties,
};

type SmlStorageSettings = typeof storageSettings;

export type SmlStorage = StorageIndexAdapter<SmlStorageSettings, SmlDocument>;

export const createSmlStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlStorage => {
  return new StorageIndexAdapter<SmlStorageSettings, SmlDocument>(
    esClient,
    logger,
    storageSettings
  );
};
