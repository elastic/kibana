/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { updateByQueryWithScript } from './ingest';

/**
 * Removes `entity.relationships.<relationshipKey>.ids` from every entity whose
 * `entity.source` matches, leaving all other relationship keys intact.
 *
 * For snapshot sources only: the caller re-populates from the current scan, so
 * clearing first is what makes a removed relationship actually disappear. On an
 * event-stream source this would erase real observations.
 */
export const clearRelationshipIdsByEntitySource = async (
  esClient: ElasticsearchClient,
  {
    index,
    entitySource,
    relationshipKey,
    signal,
  }: {
    index: string;
    entitySource: string;
    relationshipKey: string;
    signal?: AbortSignal;
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
    script: `
      if (ctx._source.entity?.relationships != null) {
        ctx._source.entity.relationships.remove(params.relationshipKey);
      }
    `,
    params: { relationshipKey },
    signal,
  });
