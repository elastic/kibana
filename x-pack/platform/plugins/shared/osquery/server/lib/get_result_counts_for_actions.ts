/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { chunk } from 'lodash';
import { ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../common/constants';
import { buildIndexNamesWithNamespaces } from '../utils/build_index_name_with_namespace';
import { prefixIndexPatternsWithCcs } from '../utils/ccs_utils';

const MAX_ACTION_IDS_PER_BATCH = 1000;

// The `*Agents` fields hold DOCUMENT counts. Correct only on live-query paths,
// where an agent emits one response doc per `action_id`. Names kept: they are
// part of the live-query response schema.
export interface ResultCountsEntry {
  totalRows: number;
  respondedAgents: number;
  successfulAgents: number;
  errorAgents: number;
}

export type ResultCountsMap = Map<string, ResultCountsEntry>;

interface ActionResponseAggregation {
  action_ids: {
    buckets: Array<{
      key: string;
      doc_count: number;
      rows_count: { value: number };
      responses: {
        buckets: Array<{
          key: string;
          doc_count: number;
        }>;
      };
    }>;
  };
}

/**
 * Aggregates live-query action-response counts per `action_id`.
 *
 * SECURITY: applies no `space_id` filter, so agent-written responses count even
 * when they were never space-stamped. Callers MUST only pass `action_id`s taken
 * from action documents already space-scoped on `.logs-osquery_manager.actions`,
 * never ids supplied by the client.
 */
export const getResultCountsForActions = async (
  esClient: ElasticsearchClient,
  actionIds: string[],
  // When Fleet cannot resolve integration namespaces the caller passes
  // `undefined`; buildIndexNamesWithNamespaces then falls back to the base
  // pattern, mirroring the other result read paths.
  integrationNamespaces?: readonly string[],
  ccsEnabled = false
): Promise<ResultCountsMap> => {
  if (actionIds.length === 0) {
    return new Map();
  }

  const batches = chunk(actionIds, MAX_ACTION_IDS_PER_BATCH);

  const batchResults = await Promise.all(
    batches.map((batchIds) =>
      fetchResultCountsBatch(esClient, batchIds, integrationNamespaces, ccsEnabled)
    )
  );

  const result: ResultCountsMap = new Map();
  for (const batchResult of batchResults) {
    for (const [actionId, counts] of batchResult) {
      result.set(actionId, counts);
    }
  }

  return result;
};

const fetchResultCountsBatch = async (
  esClient: ElasticsearchClient,
  actionIds: string[],
  integrationNamespaces: readonly string[] | undefined,
  ccsEnabled: boolean
): Promise<ResultCountsMap> => {
  const baseIndex = `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`;
  const index = prefixIndexPatternsWithCcs(
    buildIndexNamesWithNamespaces(baseIndex, integrationNamespaces),
    ccsEnabled
  );

  const response = await esClient.search<unknown, ActionResponseAggregation>({
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [{ terms: { action_id: actionIds } }],
      },
    },
    aggs: {
      action_ids: {
        terms: {
          field: 'action_id',
          size: actionIds.length,
        },
        aggs: {
          rows_count: {
            sum: {
              field: 'action_response.osquery.count',
            },
          },
          responses: {
            terms: {
              script: {
                lang: 'painless',
                source:
                  "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
              } as estypes.Script,
            },
          },
        },
      },
    },
  });

  const result: ResultCountsMap = new Map();
  const buckets = response.aggregations?.action_ids?.buckets ?? [];

  for (const bucket of buckets) {
    const successBucket = bucket.responses.buckets.find((b) => b.key === 'success');
    const errorBucket = bucket.responses.buckets.find((b) => b.key === 'error');

    result.set(bucket.key, {
      totalRows: bucket.rows_count.value ?? 0,
      respondedAgents: bucket.doc_count,
      successfulAgents: successBucket?.doc_count ?? 0,
      errorAgents: errorBucket?.doc_count ?? 0,
    });
  }

  for (const actionId of actionIds) {
    if (!result.has(actionId)) {
      result.set(actionId, {
        totalRows: 0,
        respondedAgents: 0,
        successfulAgents: 0,
        errorAgents: 0,
      });
    }
  }

  return result;
};
