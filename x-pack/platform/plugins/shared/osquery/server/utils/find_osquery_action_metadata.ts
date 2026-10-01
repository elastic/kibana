/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ACTIONS_INDEX } from '../../common/constants';
import { buildSpaceIdFilter } from './build_space_id_filter';

interface FindOsqueryActionMetadataOptions {
  esClient: ElasticsearchClient;
  spaceId: string;
  actionId: string;
  actionsIndexExists: boolean;
}

/**
 * Returns whether a Kibana-written osquery action metadata document exists for
 * the given id in the active space. Matches both the parent `action_id` and
 * per-query `queries.action_id` values because status-tab reads use sub-action ids.
 *
 * Always reads the osquery actions index rather than falling back to `.fleet-*`:
 * this runs on the end-user client under CPS, which has no Fleet grant, and only
 * Kibana-written osquery documents are guaranteed to carry `space_id`.
 */
export const findOsqueryActionMetadata = async ({
  esClient,
  spaceId,
  actionId,
  actionsIndexExists,
}: FindOsqueryActionMetadataOptions): Promise<boolean> => {
  const spaceFilter = buildSpaceIdFilter(spaceId);

  const searchResult = await esClient.search({
    index: `${ACTIONS_INDEX}*`,
    ...(actionsIndexExists ? {} : { allow_no_indices: true, ignore_unavailable: true }),
    size: 1,
    query: {
      bool: {
        filter: [
          spaceFilter,
          { term: { type: 'INPUT_ACTION' } },
          { term: { input_type: 'osquery' } },
        ],
        should: [{ term: { action_id: actionId } }, { term: { 'queries.action_id': actionId } }],
        minimum_should_match: 1,
      },
    },
    _source: false,
  });

  return searchResult.hits.hits.length > 0;
};
