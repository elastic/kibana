/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { mergeMap } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';

/**
 * Response type extension for hybrid aggregations from osquerySearchStrategy.
 * The search strategy queries both Fleet responses and results index,
 * providing unique agent IDs from both sources for accurate counting.
 */
type HybridActionResultsResponse = ActionResultsStrategyResponse & {
  rawResponse: {
    aggregations: {
      aggs: {
        responses_by_action_id: estypes.AggregationsSingleBucketAggregateBase & {
          rows_count: estypes.AggregationsSumAggregate;
          responses: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
          // unique_agent_ids comes from the DSL query aggregation
          unique_agent_ids: {
            buckets: Array<{
              key: string;
              doc_count: number;
            }>;
          };
        };
      };
    };
  };
  // Results agent data comes from the search strategy (hybrid merge)
  resultsAgentIds?: Set<string>;
  resultsAgentBuckets?: Array<{ key: string; doc_count: number }>;
  resultsTotalDocs?: number;
};

export const getActionResponses = (
  search: IScopedSearchClient,
  actionId: string,
  agentsCount: number,
  integrationNamespaces?: string[]
): Observable<{
  action_id: string;
  docs: number;
  failed: number;
  pending: number;
  responded: number;
  successful: number;
}> =>
  search
    .search<ActionResultsRequestOptions, HybridActionResultsResponse>(
      {
        actionId,
        factoryQueryType: OsqueryQueries.actionResults,
        kuery: '',
        pagination: generateTablePaginationOptions(0, 100), // Edges not used for aggregation
        sort: {
          direction: Direction.desc,
          field: '@timestamp',
        },
        integrationNamespaces,
      },
      {
        strategy: 'osquerySearchStrategy',
      }
    )
    .pipe(
      mergeMap((val) => {
        const responseAgg = val.rawResponse?.aggregations?.aggs.responses_by_action_id;
        const aggsBuckets = responseAgg?.responses.buckets;

        // Check if hybrid data is present (search strategy populates these when feature is enabled)
        const isHybridMode = val.resultsAgentIds !== undefined;

        if (isHybridMode) {
          // HYBRID MODE: Combine Fleet responses with results index data
          const docs = val.resultsTotalDocs ?? responseAgg?.rows_count?.value ?? 0;
          const fleetSuccessful =
            aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
          const fleetFailed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;

          // Extract unique Fleet agent IDs from aggregation (supports 15k agents)
          const fleetAgentBuckets = responseAgg?.unique_agent_ids?.buckets ?? [];
          const fleetRespondedAgentIds = new Set(fleetAgentBuckets.map((b) => b.key));

          // Extract results index agent IDs from hybrid merge
          const resultsAgentIds = val.resultsAgentIds ?? new Set<string>();

          // Calculate inferred successful: agents with results but no Fleet response
          const inferredSuccessfulCount = Array.from(resultsAgentIds).filter(
            (agentId) => !fleetRespondedAgentIds.has(agentId)
          ).length;

          // Hybrid calculations
          const totalResponded = fleetRespondedAgentIds.size + inferredSuccessfulCount;
          const successful = fleetSuccessful + inferredSuccessfulCount;
          const pending = Math.max(0, agentsCount - totalResponded);

          return of({
            action_id: actionId,
            docs,
            failed: fleetFailed,
            pending,
            responded: totalResponded,
            successful,
          });
        } else {
          // LEGACY MODE: Use only Fleet responses (original behavior)
          const responded = responseAgg?.doc_count ?? 0;
          const docs = responseAgg?.rows_count?.value ?? 0;
          const successful =
            aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
          const failed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;
          const pending = agentsCount - responded;

          return of({
            action_id: actionId,
            docs,
            failed,
            pending,
            responded,
            successful,
          });
        }
      })
    );
