/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { isEmpty } from 'lodash';
import moment from 'moment';
import type { ActionResultsRequestOptions } from '../../../../../../common/search_strategy';
import { buildIndexNameWithNamespace } from '../../../../../utils/build_index_name_with_namespace';
import { getQueryFilter } from '../../../../../utils/build_query';
import { OSQUERY_INTEGRATION_NAME, ACTION_EXPIRATION } from '../../../../../../common';

// Batch size for composite aggregation pagination
export const COMPOSITE_AGGREGATION_BATCH_SIZE = 10000;

export interface ResultsAgentsQueryOptions
  extends Pick<ActionResultsRequestOptions, 'actionId' | 'startDate' | 'integrationNamespaces'> {
  /** After key for composite aggregation pagination */
  afterKey?: { agent_id: string };
}

/**
 * Builds a query to aggregate unique agent IDs from the results index.
 * Uses composite aggregation for unlimited scale - can handle any number of agents
 * by paginating through results using the afterKey parameter.
 *
 * @param options - Query options including actionId, startDate, integration namespaces, and afterKey
 * @returns Elasticsearch query DSL configured for agent ID aggregation
 */
export const buildResultsAgentsQuery = ({
  actionId,
  startDate,
  integrationNamespaces,
  afterKey,
}: ResultsAgentsQueryOptions): ISearchRequestParams => {
  // Build filter query for action_id
  const filter = `action_id: ${actionId}`;

  // Add time range filter if provided (search window from start)
  const timeRangeFilter =
    startDate && !isEmpty(startDate)
      ? [
          {
            range: {
              '@timestamp': {
                gte: startDate,
                lte: moment(startDate)
                  .clone()
                  .add(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES, 'minutes')
                  .toISOString(),
              },
            },
          },
        ]
      : [];

  const filterQuery = [...timeRangeFilter, getQueryFilter({ filter })];

  // Build index pattern with namespace awareness
  const baseIndex = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;
  let index: string;

  if (integrationNamespaces && integrationNamespaces.length > 0) {
    index = integrationNamespaces
      .map((namespace) => buildIndexNameWithNamespace(baseIndex, namespace))
      .join(',');
  } else {
    index = baseIndex;
  }

  // Build composite aggregation for unlimited agent support
  const compositeAgg: Record<string, unknown> = {
    size: COMPOSITE_AGGREGATION_BATCH_SIZE,
    sources: [
      {
        agent_id: {
          terms: {
            field: 'agent.id',
          },
        },
      },
    ],
  };

  // Add after key for pagination (subsequent requests)
  if (afterKey) {
    compositeAgg.after = afterKey;
  }

  return {
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    size: 0, // No documents needed, only aggregations
    track_total_hits: true, // Get total docs count
    query: { bool: { filter: filterQuery } },
    aggs: {
      unique_agents: {
        composite: compositeAgg,
      },
    },
  };
};
