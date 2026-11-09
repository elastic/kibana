/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UpdateByQueryWithScriptOptions } from './ingest';
import { updateByQueryWithScript } from './ingest';

/**
 * Removes only the `ids` member of `entity.relationships.<relationshipKey>`,
 * then drops the relationship object itself if nothing else remains.
 *
 * Removing the whole relationship object would also delete sibling data the
 * maintainer does not own — `raw_identifiers` in particular, which other
 * integrations populate and which the maintainer reads rather than writes.
 */
const CLEAR_RELATIONSHIP_IDS_SCRIPT = `
  if (ctx._source.entity?.relationships != null) {
    def relationship = ctx._source.entity.relationships.get(params.relationshipKey);
    if (relationship instanceof Map) {
      relationship.remove('ids');
      if (relationship.isEmpty()) {
        ctx._source.entity.relationships.remove(params.relationshipKey);
      }
    }
  }
`;

/**
 * Removes `entity.relationships.<relationshipKey>.ids` from every entity whose
 * `entity.source` matches, leaving all other relationship keys — and every
 * sibling field of this one — intact.
 *
 * For snapshot sources only: the caller re-populates from the current scan, so
 * clearing first is what makes a removed relationship actually disappear. On an
 * event-stream source this would erase real observations.
 *
 * Pass `waitForTask` to run as a background task and poll for completion. This
 * is a full-index mutation whose runtime scales with the source's entity count,
 * so a synchronous call can exceed the Elasticsearch client's request timeout
 * on a large tenant — leaving relationships partially cleared with no signal.
 */
export const clearRelationshipIdsByEntitySource = async (
  esClient: ElasticsearchClient,
  {
    index,
    entitySource,
    relationshipKey,
    signal,
    waitForTask,
  }: {
    index: string;
    entitySource: string;
    relationshipKey: string;
    signal?: AbortSignal;
    waitForTask?: UpdateByQueryWithScriptOptions['waitForTask'];
  }
): Promise<{ updated: number; total: number }> =>
  updateByQueryWithScript(esClient, {
    index,
    query: {
      bool: {
        filter: [
          { term: { 'entity.source': entitySource } },
          // Keeps the operation proportional to entities that actually hold the
          // relationship rather than every document from this source.
          { exists: { field: `entity.relationships.${relationshipKey}.ids` } },
        ],
      },
    },
    // relationshipKey arrives as a param, never interpolated into the source:
    // it is config-supplied and must not be evaluated as Painless.
    script: CLEAR_RELATIONSHIP_IDS_SCRIPT,
    params: { relationshipKey },
    signal,
    ...(waitForTask ? { waitForTask } : {}),
  });
