/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ElasticsearchClient } from '@kbn/core/server';

import { AGENT_POLICY_INDEX } from '../../../common';

import type { Context, PoliciesRevisionSummaries } from './types';

export const getPoliciesToClean = async (esClient: ElasticsearchClient, context: Context) => {
  const {
    config: { maxRevisions },
  } = context;
  const results = await queryMaxRevisionsAndCounts(esClient, context);
  return (
    results.aggregations?.latest_revisions_by_policy_id.buckets.reduce<PoliciesRevisionSummaries>(
      (acc, bucket) => {
        if (bucket.doc_count > maxRevisions) {
          acc[bucket.key] = {
            maxRevision: bucket.latest_revision.value,
            count: bucket.doc_count,
          };
        }
        return acc;
      },
      {}
    ) ?? {}
  );
};

const queryMaxRevisionsAndCounts = async (esClient: ElasticsearchClient, context: Context) => {
  interface Aggregations {
    latest_revisions_by_policy_id: {
      buckets: Array<{
        key: string;
        doc_count: number;
        latest_revision: {
          value: number;
        };
      }>;
    };
  }

  return await esClient.search<{}, Aggregations>(
    {
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      size: 0,
      aggs: {
        latest_revisions_by_policy_id: {
          terms: {
            field: 'policy_id',
            order: { _count: 'desc' },
            size: context.config.maxPolicies,
          },
          aggs: {
            latest_revision: {
              max: {
                field: 'revision_idx',
              },
            },
          },
        },
      },
    },
    { signal: context.abortController?.signal }
  );
};
