/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { buildActionDetailsQuery } from '../search_strategy/osquery/factory/actions/details/query.action_details.dsl';
import { buildResultsQuery } from '../search_strategy/osquery/factory/results/query.all_results.dsl';
import { buildActionResultsQuery } from '../search_strategy/osquery/factory/actions/results/query.action_results.dsl';
import type { ActionDetails } from '../../common/search_strategy/osquery/actions';
import { Direction } from '../../common/search_strategy';
import { generateTablePaginationOptions } from '../../common/utils/build_query';
import { ACTIONS_INDEX } from '../../common/constants';

export interface ActionDetailsResult {
  actionId: string;
  queries: Array<{
    action_id: string;
    agents?: string[];
    query?: string;
  }>;
  expirationDate?: string;
  isExpired: boolean;
  source?: ActionDetails;
}

export interface ActionResponseStatus {
  action_id: string;
  pending: number;
  responded: number;
  successful: number;
  failed: number;
  docs: number;
}

export interface QueryResultsOptions {
  kuery?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
}

export interface QueryResults {
  total: number;
  edges: Array<{ _id: string; _index: string; fields?: Record<string, unknown> }>;
}

/**
 * Checks if the osquery actions index exists
 */
async function checkActionsIndexExists(esClient: IScopedClusterClient): Promise<boolean> {
  try {
    return await esClient.asInternalUser.indices.exists({
      index: `${ACTIONS_INDEX}*`,
    });
  } catch {
    return false;
  }
}

/**
 * Fetches action details using the existing DSL builder
 */
export async function getActionDetails(
  esClient: IScopedClusterClient,
  actionId: string,
  spaceId: string,
  logger: Logger
): Promise<ActionDetailsResult | null> {
  try {
    const componentTemplateExists = await checkActionsIndexExists(esClient);

    const dsl = buildActionDetailsQuery({
      actionId,
      spaceId: spaceId || DEFAULT_SPACE_ID,
      componentTemplateExists,
    } as Parameters<typeof buildActionDetailsQuery>[0]);

    const response = await esClient.asInternalUser.search<ActionDetails>({
      ...dsl,
      allow_no_indices: true,
      ignore_unavailable: true,
    });

    if (response.hits.hits.length > 0) {
      const hit = response.hits.hits[0];
      const source = hit._source;
      const fields = hit.fields as Record<string, unknown[]> | undefined;

      const expirationDate = fields?.expiration?.[0] as string | undefined;
      const isExpired = expirationDate ? new Date(expirationDate) < new Date() : true;

      return {
        actionId,
        queries: source?.queries || [],
        expirationDate,
        isExpired,
        source,
      };
    }

    return null;
  } catch (error) {
    logger.debug(`Error fetching action details for ${actionId}: ${error}`);
    return null;
  }
}

/**
 * Gets the response status for an action using the existing DSL builder
 */
export async function getActionResponseStatus(
  esClient: IScopedClusterClient,
  actionId: string,
  expectedAgentCount: number,
  logger: Logger,
  integrationNamespaces?: string[]
): Promise<ActionResponseStatus> {
  try {
    const componentTemplateExists = await checkActionsIndexExists(esClient);

    const dsl = buildActionResultsQuery({
      actionId,
      kuery: '',
      pagination: generateTablePaginationOptions(0, 1),
      sort: {
        direction: Direction.desc,
        field: '@timestamp',
      },
      componentTemplateExists,
      integrationNamespaces,
    } as Parameters<typeof buildActionResultsQuery>[0]);

    const response = await esClient.asInternalUser.search({
      ...dsl,
      size: 0, // We only need aggregations
      allow_no_indices: true,
      ignore_unavailable: true,
    });

    const aggs = response.aggregations as {
      aggs?: {
        responses_by_action_id?: {
          doc_count?: number;
          rows_count?: { value?: number };
          responses?: { buckets?: Array<{ key: string; doc_count: number }> };
        };
      };
    };

    const responsesAgg = aggs?.aggs?.responses_by_action_id;
    if (responsesAgg && (responsesAgg.doc_count ?? 0) > 0) {
      const responded = responsesAgg.doc_count ?? 0;
      const docs = responsesAgg.rows_count?.value ?? 0;
      const buckets = responsesAgg.responses?.buckets ?? [];
      const successful = buckets.find((b) => b.key === 'success')?.doc_count ?? 0;
      const failed = buckets.find((b) => b.key === 'error')?.doc_count ?? 0;
      const pending = Math.max(0, expectedAgentCount - responded);

      return {
        action_id: actionId,
        pending,
        responded,
        successful,
        failed,
        docs,
      };
    }

    // No responses found yet
    return {
      action_id: actionId,
      pending: expectedAgentCount,
      responded: 0,
      successful: 0,
      failed: 0,
      docs: 0,
    };
  } catch (error) {
    logger.debug(`Error fetching action response status for ${actionId}: ${error}`);
    return {
      action_id: actionId,
      pending: expectedAgentCount,
      responded: 0,
      successful: 0,
      failed: 0,
      docs: 0,
    };
  }
}

/**
 * Fetches query results using the existing DSL builder.
 * This follows the same logic as get_live_query_results_route.ts
 */
export async function getQueryResults(
  esClient: IScopedClusterClient,
  actionId: string,
  options: QueryResultsOptions,
  logger: Logger,
  integrationNamespaces?: string[]
): Promise<QueryResults> {
  const {
    page = 0,
    pageSize = 100,
    sort = '@timestamp',
    sortOrder = 'desc',
    kuery,
    startDate,
  } = options;

  try {
    const dsl = buildResultsQuery({
      actionId,
      kuery,
      startDate,
      pagination: generateTablePaginationOptions(page, pageSize),
      sort: [
        {
          direction: sortOrder === 'asc' ? Direction.asc : Direction.desc,
          field: sort,
        },
      ],
      integrationNamespaces,
    } as Parameters<typeof buildResultsQuery>[0]);

    logger.debug(`Querying results with DSL: ${JSON.stringify(dsl)}`);

    const response = await esClient.asInternalUser.search({
      ...dsl,
      allow_no_indices: true,
      ignore_unavailable: true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total as estypes.SearchTotalHits)?.value ?? 0;

    logger.debug(`Found ${total} results for action ${actionId}`);

    return {
      total,
      edges: response.hits.hits.map((hit) => ({
        _id: hit._id!,
        _index: hit._index,
        fields: hit.fields as Record<string, unknown>,
      })),
    };
  } catch (error) {
    logger.error(`Error fetching query results for ${actionId}: ${error}`);
    return { total: 0, edges: [] };
  }
}

