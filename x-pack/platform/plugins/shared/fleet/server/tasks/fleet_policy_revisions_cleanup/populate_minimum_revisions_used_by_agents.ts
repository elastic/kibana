/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ElasticsearchClient } from '@kbn/core/server';

import { AGENTS_INDEX } from '../../../common';

import type { Context, PoliciesRevisionSummaries } from './types';

export const populateMinimumRevisionsUsedByAgents = async (
  esClient: ElasticsearchClient,
  policiesRevisionSummaries: PoliciesRevisionSummaries,
  context: Context
) => {
  const result = await queryMinimumRevisionsUsedByAgents(
    esClient,
    Object.keys(policiesRevisionSummaries),
    context
  );

  result.aggregations?.min_used_revisions_by_policy_id.buckets.forEach((bucket) => {
    const policySummary = policiesRevisionSummaries[bucket.key];
    if (policySummary) {
      policySummary.minUsedRevision = bucket.min_used_revision.value;
    }
  });

  return policiesRevisionSummaries;
};

const queryMinimumRevisionsUsedByAgents = async (
  esClient: ElasticsearchClient,
  policyIds: string[],
  context: Context
) => {
  interface Aggregations {
    min_used_revisions_by_policy_id: {
      buckets: Array<{
        key: string;
        doc_count: number;
        min_used_revision: {
          value: number;
        };
      }>;
    };
  }

  return await esClient.search<{}, Aggregations>(
    {
      index: AGENTS_INDEX,
      ignore_unavailable: true,
      size: 0,
      query: {
        terms: {
          policy_id: policyIds,
        },
      },
      aggs: {
        min_used_revisions_by_policy_id: {
          terms: {
            field: 'policy_id',
            size: context.config.maxPolicies,
          },
          aggs: {
            min_used_revision: {
              min: {
                field: 'policy_revision_idx',
              },
            },
          },
        },
      },
    },
    { signal: context.abortController?.signal }
  );
};
