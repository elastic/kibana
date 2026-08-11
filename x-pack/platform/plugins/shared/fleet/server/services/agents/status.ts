/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type {
  AggregationsTermsAggregateBase,
  AggregationsTermsBucketBase,
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';

import { ALL_SPACES_ID } from '../../../common/constants';
import { agentStatusesToSummary } from '../../../common/services';
import { AGENTS_INDEX } from '../../constants';
import type { AgentStatus } from '../../types';
import { FleetError, FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../app_context';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';

import {
  buildPolicyBaseIdWithFallbackEsFilter,
  buildPolicyBaseIdsWithFallbackEsFilter,
} from '../../../common/services/version_specific_policies_utils';

import { DEFAULT_NAMESPACES_FILTER } from '../spaces/agent_namespaces';

import { getAgentById, removeSOAttributes } from './crud';
import { buildAgentStatusRuntimeField } from './build_status_runtime_field';

interface AggregationsStatusTermsBucketKeys extends AggregationsTermsBucketBase {
  key: AgentStatus;
}

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';
export const MAX_AGENT_DATA_PREVIEW_SIZE = 20;
export async function getAgentStatusById(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentStatus> {
  return (await getAgentById(esClient, soClient, agentId)).status!;
}
const AGENT_STATUS_TIMEOUT = '3s';

/**
 * getAgentStatusForAgentPolicy
 * @param esClient
 * @param soClient
 * @param agentPolicyId @deprecated use agentPolicyIds instead since the move to multi-policy
 * @param filterKuery
 * @param spaceId
 * @param agentPolicyIds
 */

export async function getAgentStatusForAgentPolicy(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string,
  filterKuery?: string,
  spaceId?: string,
  agentPolicyIds?: string[]
) {
  const logger = appContextService.getLogger();
  const runtimeFields = await buildAgentStatusRuntimeField(soClient);

  const clauses: QueryDslQueryContainer[] = [];

  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (useSpaceAwareness && spaceId) {
    if (spaceId === DEFAULT_SPACE_ID) {
      clauses.push(toElasticsearchQuery(fromKueryExpression(DEFAULT_NAMESPACES_FILTER)));
    } else {
      clauses.push(
        toElasticsearchQuery(
          fromKueryExpression(`namespaces:"${spaceId}" or namespaces:"${ALL_SPACES_ID}"`)
        )
      );
    }
  }

  if (filterKuery) {
    const kueryAsElasticsearchQuery = toElasticsearchQuery(
      fromKueryExpression(removeSOAttributes(filterKuery))
    );
    clauses.push(kueryAsElasticsearchQuery);
  }
  if (agentPolicyIds) {
    clauses.push(buildPolicyBaseIdsWithFallbackEsFilter(agentPolicyIds));
  } else if (agentPolicyId) {
    clauses.push(buildPolicyBaseIdWithFallbackEsFilter(agentPolicyId));
  }

  const query =
    clauses.length > 0
      ? {
          bool: {
            must: clauses,
          },
        }
      : undefined;

  const statuses: Record<AgentStatus, number> = {
    online: 0,
    error: 0,
    inactive: 0,
    offline: 0,
    uninstalled: 0,
    orphaned: 0,
    updating: 0,
    unenrolled: 0,
    degraded: 0,
    enrolling: 0,
    unenrolling: 0,
  };

  let response;

  try {
    response = await retryTransientEsErrors(
      () =>
        esClient.search<
          null,
          { status: AggregationsTermsAggregateBase<AggregationsStatusTermsBucketKeys> }
        >({
          index: AGENTS_INDEX,
          size: 0,
          query,
          fields: Object.keys(runtimeFields),
          runtime_mappings: runtimeFields,
          aggregations: {
            status: {
              terms: {
                field: 'status',
                size: Object.keys(statuses).length,
              },
            },
          },
          ignore_unavailable: true,
          timeout: AGENT_STATUS_TIMEOUT,
        }),
      { logger }
    );
  } catch (error) {
    logger.debug(`Error getting agent statuses: ${error}`);
    throw new FleetError(
      `Unable to retrive agent statuses for policy ${agentPolicyId} due to error: ${error.message}`
    );
  }

  const buckets = (response?.aggregations?.status?.buckets ||
    []) as AggregationsStatusTermsBucketKeys[];

  buckets.forEach((bucket) => {
    if (statuses[bucket.key] !== undefined) {
      statuses[bucket.key] = bucket.doc_count;
    }
  });

  const { healthy: online, unhealthy: error, ...otherStatuses } = agentStatusesToSummary(statuses);
  const combinedStatuses = { online, error, ...otherStatuses };
  const allStatuses = Object.values(statuses).reduce((acc, val) => acc + val, 0);
  const allActive = allStatuses - combinedStatuses.unenrolled - combinedStatuses.inactive;
  return {
    ...combinedStatuses,
    all: allStatuses,
    active: allActive,
    /* @deprecated no agents will have other status */
    other: 0,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
    /* @deprecated use active instead */
    total: allActive,
  };
}

export async function getIncomingDataByAgentsId({
  esClient,
  agentsIds,
  dataStreamPattern = DATA_STREAM_INDEX_PATTERN,
  returnDataPreview = false,
}: {
  esClient: ElasticsearchClient;
  agentsIds: string[];
  dataStreamPattern?: string;
  returnDataPreview?: boolean;
}) {
  const logger = appContextService.getLogger();

  try {
    const { has_all_requested: hasAllPrivileges } = await esClient.security.hasPrivileges({
      index: [
        {
          names: dataStreamPattern.split(','),
          privileges: ['read'],
        },
      ],
    });

    if (!hasAllPrivileges) {
      throw new FleetUnauthorizedError('Missing permissions to read data streams indices');
    }

    const searchResult = await retryTransientEsErrors(
      () =>
        esClient.search<unknown, Record<'agent_ids', { buckets: Array<{ key: string }> }>>({
          index: dataStreamPattern,
          allow_partial_search_results: true,
          _source: returnDataPreview,
          timeout: '5s',
          size: returnDataPreview ? MAX_AGENT_DATA_PREVIEW_SIZE : 0,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'agent.id': agentsIds,
                  },
                },
                {
                  range: {
                    'event.ingested': {
                      gte: 'now-5m',
                      lte: 'now',
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            agent_ids: {
              terms: {
                field: 'agent.id',
                size: agentsIds.length,
              },
            },
          },
        }),
      { logger }
    );

    if (!searchResult.aggregations?.agent_ids) {
      return {
        items: agentsIds.map((id) => ({ [id]: { data: false } })),
        dataPreview: [],
      };
    }

    const dataPreview = searchResult.hits?.hits || [];

    const agentIdsWithData: string[] = searchResult.aggregations.agent_ids.buckets.map(
      (bucket) => bucket.key
    );

    const items = agentsIds.map((id) =>
      agentIdsWithData.includes(id) ? { [id]: { data: true } } : { [id]: { data: false } }
    );

    return { items, dataPreview };
  } catch (error) {
    logger.debug(`Error getting incoming data for agents: ${error}`);
    throw new FleetError(
      `Unable to retrieve incoming data for agents due to error: ${error.message}`
    );
  }
}

/**
 * Identity-free incoming-data check for a single agentless agent whose data streams carry no
 * queryable agent identity (native OTel documents). The caller must scope `dataStreamPattern` to
 * the agent's own namespace; see `getAgentDataHandler` for the gate that guarantees this.
 */
export async function getIncomingDataByDataStreams({
  esClient,
  agentId,
  dataStreamPattern,
  returnDataPreview = false,
}: {
  esClient: ElasticsearchClient;
  agentId: string;
  dataStreamPattern: string;
  returnDataPreview?: boolean;
}) {
  const logger = appContextService.getLogger();

  try {
    const { has_all_requested: hasAllPrivileges } = await esClient.security.hasPrivileges({
      index: [
        {
          names: dataStreamPattern.split(','),
          privileges: ['read'],
        },
      ],
    });

    if (!hasAllPrivileges) {
      throw new FleetUnauthorizedError('Missing permissions to read data streams indices');
    }

    const searchResult = await retryTransientEsErrors(
      () =>
        esClient.search({
          index: dataStreamPattern,
          // The pattern names concrete data streams that may not exist yet; without this,
          // Elasticsearch throws index_not_found_exception instead of returning zero hits.
          ignore_unavailable: true,
          allow_partial_search_results: true,
          _source: returnDataPreview,
          timeout: '5s',
          size: returnDataPreview ? MAX_AGENT_DATA_PREVIEW_SIZE : 0,
          terminate_after: returnDataPreview ? undefined : 1,
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'event.ingested': {
                      gte: 'now-5m',
                      lte: 'now',
                    },
                  },
                },
              ],
            },
          },
        }),
      { logger }
    );

    const dataPreview = searchResult.hits?.hits || [];
    const total = searchResult.hits.total as SearchTotalHits | undefined;
    const hasData = (total?.value ?? 0) > 0;

    return { items: [{ [agentId]: { data: hasData } }], dataPreview };
  } catch (error) {
    logger.debug(`Error getting incoming data for data streams: ${error}`);
    throw new FleetError(
      `Unable to retrieve incoming data for agents due to error: ${error.message}`
    );
  }
}
