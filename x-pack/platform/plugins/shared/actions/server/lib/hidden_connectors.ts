/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CoreScopedAccessControl } from '@kbn/core-security-server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import type { ConnectorAccessContext } from './connector_access';
import { getConnectorAccessControl, getConnectorSpaceId } from './connector_access';

const RAW_ID_PREFIX = `${ACTION_SAVED_OBJECT_TYPE}:`;
const PAGE_SIZE = 1000;
const POINT_IN_TIME_KEEP_ALIVE = '1m';

/**
 * Returns the IDs of the connectors in the given spaces that the caller cannot view. Only these
 * IDs leave the system read, never connector content. Any error throws, so that a caller never
 * gets unfiltered results.
 */
export const getHiddenConnectorIds = async ({
  esClient,
  accessControl,
  spaceIds,
}: {
  esClient: ElasticsearchClient;
  accessControl: Pick<CoreScopedAccessControl, 'getReadFilter'>;
  spaceIds: string[];
}): Promise<string[]> => {
  const visible = await accessControl.getReadFilter({ type: ACTION_SAVED_OBJECT_TYPE, spaceIds });
  if (!visible) {
    return [];
  }

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [{ term: { type: ACTION_SAVED_OBJECT_TYPE } }, { terms: { namespaces: spaceIds } }],
      must_not: [visible],
    },
  };

  const { id: pitId } = await esClient.openPointInTime({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    keep_alive: POINT_IN_TIME_KEEP_ALIVE,
  });

  const ids: string[] = [];
  let pit = { id: pitId, keep_alive: POINT_IN_TIME_KEEP_ALIVE };
  let searchAfter: estypes.SortResults | undefined;
  try {
    while (true) {
      const response = await esClient.search({
        query,
        pit,
        size: PAGE_SIZE,
        sort: ['_shard_doc'],
        _source: false,
        ...(searchAfter && { search_after: searchAfter }),
      });
      const { hits } = response.hits;
      // Connectors are isolated to one space, so their raw IDs carry no namespace prefix.
      ids.push(
        ...hits.flatMap(({ _id: rawId }) => (rawId ? [rawId.slice(RAW_ID_PREFIX.length)] : []))
      );

      if (hits.length < PAGE_SIZE) {
        return ids;
      }
      searchAfter = hits[hits.length - 1].sort;
      pit = { ...pit, id: response.pit_id ?? pit.id };
    }
  } finally {
    await esClient.closePointInTime({ id: pit.id });
  }
};

/**
 * Narrows an execution log authorization filter so that events of connectors the caller cannot
 * view add nothing to rows, totals, or aggregations. The filter stays the same when object-level
 * security is disabled or nothing is hidden.
 */
export const excludeHiddenConnectors = async (
  context: ConnectorAccessContext & { esClient: ElasticsearchClient },
  { filter, namespaces }: { filter: KueryNode; namespaces?: Array<string | undefined> }
): Promise<KueryNode> => {
  const accessControl = getConnectorAccessControl(context);
  if (!accessControl) {
    return filter;
  }

  const spaceIds =
    namespaces && namespaces.length > 0
      ? namespaces.map((namespace) => namespace ?? DEFAULT_SPACE_ID)
      : [getConnectorSpaceId(context)];
  const hiddenIds = await getHiddenConnectorIds({
    esClient: context.esClient,
    accessControl,
    spaceIds,
  });
  if (hiddenIds.length === 0) {
    return filter;
  }

  // Action events reference their connector in the nested `kibana.saved_objects` field, so the
  // exclusion matches the type and the ID within the same nested object.
  return nodeBuilder.and([
    filter,
    nodeTypes.function.buildNode(
      'not',
      nodeTypes.function.buildNode(
        'nested',
        'kibana.saved_objects',
        nodeBuilder.and([
          nodeBuilder.is('type', ACTION_SAVED_OBJECT_TYPE),
          nodeBuilder.or(hiddenIds.map((id) => nodeBuilder.is('id', id))),
        ])
      )
    ),
  ]);
};
