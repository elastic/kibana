/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ACTIONS_INDEX } from '../../common/constants';
import { buildSpaceIdFilter } from '../utils/build_space_id_filter';

export interface ActionOwnership {
  found: boolean;
  /** Agents the query action was dispatched to, when the action document records them. */
  expectedAgentCount?: number;
}

interface OsqueryActionSource {
  action_id?: string;
  agents?: string[];
  queries?: Array<{ action_id?: string; agents?: string[] }>;
}

/**
 * Confirms a query `action_id` belongs to an osquery action created in
 * `spaceId`, and reports how many agents that query was dispatched to.
 *
 * `get_live_query_results` receives the id as free-form model input, so this is
 * the ownership boundary: the results read is only as scoped as the id it
 * trusts. Mirrors the parent/child check in `get_live_query_results_route`,
 * which rejects a sub-action id that does not belong to the parent action.
 *
 * The action index is matched with `matchMissingSpaceId: false` — action
 * documents are written server-side and always carry `space_id`, so a
 * field-less document must not be treated as belonging to the default space.
 */
export const assertActionBelongsToSpace = async (
  esClient: ElasticsearchClient,
  queryActionId: string,
  spaceId: string
): Promise<ActionOwnership> => {
  const result = await esClient.search<OsqueryActionSource>({
    index: `${ACTIONS_INDEX}*`,
    size: 1,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { action_id: queryActionId } },
                { term: { 'queries.action_id': queryActionId } },
              ],
              minimum_should_match: 1,
            },
          },
          buildSpaceIdFilter(spaceId, { matchMissingSpaceId: false }),
        ],
      },
    },
  });

  const hit = result.hits.hits[0];

  if (!hit) {
    return { found: false };
  }

  const source = hit._source ?? {};

  // A parent action id is a container, not a query: response/result documents
  // carry only the per-query child id, so polling with the parent id can never
  // match. Accept the id only when it identifies an actual query — a child
  // entry in the parent doc's `queries[]`, or a doc that IS the query (its own
  // action_id with no `queries` container).
  const matchingQuery = source.queries?.find((query) => query.action_id === queryActionId);
  if (!matchingQuery && (source.queries?.length || source.action_id !== queryActionId)) {
    return { found: false };
  }

  const expectedAgentCount = (matchingQuery?.agents ?? source.agents)?.length;

  return {
    found: true,
    ...(expectedAgentCount !== undefined && { expectedAgentCount }),
  };
};
