/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { ACTIONS_INDEX } from '../../common/constants';
import { buildSpaceIdFilter } from './build_space_id_filter';

interface FindOsqueryActionMetadataOptions {
  esClient: ElasticsearchClient;
  spaceId: string;
  actionId: string;
  actionsIndexExists: boolean;
  /**
   * When set, hits are memoized for the lifetime of this request, so the route
   * gate, the search strategy gate, every per-query read of one pack and every
   * page of an export share a single lookup.
   */
  request?: KibanaRequest;
}

interface ActionDocumentIds {
  action_id?: string;
  queries?: Array<{ action_id?: string }>;
}

interface RequestVerification {
  verifiedIds: Set<string>;
  pending?: Promise<unknown>;
}

// Keyed on the server-created request object, so a client cannot seed it. Only
// hits are stored: a miss is a 404 and is never served from here.
const verificationsByRequest = new WeakMap<KibanaRequest, Map<string, RequestVerification>>();

const getRequestVerification = (request: KibanaRequest, spaceId: string): RequestVerification => {
  let bySpace = verificationsByRequest.get(request);
  if (!bySpace) {
    bySpace = new Map();
    verificationsByRequest.set(request, bySpace);
  }

  let verification = bySpace.get(spaceId);
  if (!verification) {
    verification = { verifiedIds: new Set() };
    bySpace.set(spaceId, verification);
  }

  return verification;
};

/**
 * Returns the parent and sub-action ids of the action document matching
 * `actionId` in the active space, or an empty list when none matches.
 */
const searchActionDocumentIds = async ({
  esClient,
  spaceId,
  actionId,
  actionsIndexExists,
}: Omit<FindOsqueryActionMetadataOptions, 'request'>): Promise<string[]> => {
  const searchResult = await esClient.search<ActionDocumentIds>({
    index: `${ACTIONS_INDEX}*`,
    ...(actionsIndexExists ? {} : { allow_no_indices: true, ignore_unavailable: true }),
    size: 1,
    query: {
      bool: {
        filter: [
          buildSpaceIdFilter(spaceId),
          { term: { type: 'INPUT_ACTION' } },
          { term: { input_type: 'osquery' } },
        ],
        should: [{ term: { action_id: actionId } }, { term: { 'queries.action_id': actionId } }],
        minimum_should_match: 1,
      },
    },
    // Ids only: the document's `agents` list can hold 100k+ entries.
    _source: ['action_id', 'queries.action_id'],
  });

  const [hit] = searchResult.hits.hits;
  if (!hit) {
    return [];
  }

  const source = hit._source ?? {};
  const ids = [source.action_id, ...(source.queries ?? []).map((query) => query.action_id)].filter(
    (id): id is string => typeof id === 'string' && id !== ''
  );

  return [actionId, ...ids.filter((id) => id !== actionId)];
};

/**
 * Returns whether a Kibana-written osquery action metadata document exists for
 * the given id in the active space. Matches both the parent `action_id` and
 * per-query `queries.action_id` values because status-tab reads use sub-action ids.
 *
 * Always reads the osquery actions index rather than falling back to `.fleet-*`:
 * this runs on the end-user client under CPS, which has no Fleet grant, and only
 * Kibana-written osquery documents are guaranteed to carry `space_id`.
 *
 * In the default space this also matches action documents with no `space_id`,
 * including on a CPS fan-out. Those predate osquery space awareness, and the
 * live history list applies the same allowance, so a listed row never 404s when
 * opened. Tightening it is tracked with the default-space read in #19416.
 */
export const findOsqueryActionMetadata = async ({
  request,
  ...options
}: FindOsqueryActionMetadataOptions): Promise<boolean> => {
  if (!request) {
    return (await searchActionDocumentIds(options)).length > 0;
  }

  const verification = getRequestVerification(request, options.spaceId);
  if (verification.verifiedIds.has(options.actionId)) {
    return true;
  }

  // Concurrent reads of one pack's queries wait for the first lookup, which
  // records every sibling id, instead of each issuing its own.
  if (verification.pending) {
    await verification.pending.catch(() => undefined);
    if (verification.verifiedIds.has(options.actionId)) {
      return true;
    }
  }

  const lookup = searchActionDocumentIds(options);
  verification.pending = lookup;
  const ids = await lookup;
  ids.forEach((id) => verification.verifiedIds.add(id));

  return ids.length > 0;
};
