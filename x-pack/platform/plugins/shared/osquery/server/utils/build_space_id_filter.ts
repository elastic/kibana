/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Builds the `space_id` filter clause for osquery ES reads.
 *
 * `spaceId` is required and the function always returns a clause. Callers that
 * lack an active space resolve it to {@link DEFAULT_SPACE_ID} before reaching
 * here — never pass `undefined`.
 *
 * In the default space we also match documents with a missing `space_id`
 * field, because agent-emitted osquerybeat documents (results / action
 * responses) may not carry the field. Named spaces match the `space_id` term
 * exactly and never include field-less documents.
 *
 * `matchMissingSpaceId: false` drops that allowance. Equating "no field" with
 * "default space" only holds while the search is confined to one project. A
 * pack config saved without the per-query `space_id` (see #272411) keeps
 * producing field-less documents until the pack is re-saved, so under CPS
 * fan-out such a document from a linked project may belong to a named space
 * there. Callers whose query is not already bound to an action or schedule id
 * the user could only have learned from a space-stamped document must pass
 * `false` when the read fans out.
 *
 * `matchActionDataSpaceId: true` additionally matches `action_data.space_id`.
 * Kibana's top-level `space_id` on the Fleet action never reaches the agent —
 * Fleet Server's action model has no such field and its checkin conversion is a
 * per-field whitelist — so it is also written inside the action's `data` blob,
 * which is an opaque passthrough. osquerybeat copies that blob verbatim onto
 * result and action-response documents as `action_data`, so the originating
 * space arrives as `action_data.space_id` with no agent-side change.
 *
 * SECURITY: `action_data` is the query payload round-tripped through the agent,
 * so it is less trustworthy than the Kibana-written top-level field. Only pass
 * `true` from a read already bound to an `action_id` or `schedule_id` — that id
 * can only have been learned from a space-stamped, Kibana-written action
 * document, and that binding is the authorization gate. Never enable it on a
 * read that enumerates across actions.
 *
 * This flag is orthogonal to `matchMissingSpaceId` and stays valid when it is
 * `false`: `action_data.space_id` is a present, exact-valued term carrying real
 * provenance, so it does not share the ambiguity of a missing field under CPS
 * fan-out. Do not collapse the two.
 */
export const buildSpaceIdFilter = (
  spaceId: string,
  {
    matchMissingSpaceId = true,
    matchActionDataSpaceId = false,
  }: { matchMissingSpaceId?: boolean; matchActionDataSpaceId?: boolean } = {}
): estypes.QueryDslQueryContainer => {
  // Clauses are combined with `should`, which defaults to minimum_should_match: 1
  // in the filter context these clauses are always used in.
  const shouldClauses: estypes.QueryDslQueryContainer[] = [{ term: { space_id: spaceId } }];

  if (spaceId === DEFAULT_SPACE_ID && matchMissingSpaceId) {
    shouldClauses.push({ bool: { must_not: { exists: { field: 'space_id' } } } });
  }

  if (matchActionDataSpaceId) {
    shouldClauses.push({ term: { 'action_data.space_id': spaceId } });
  }

  // Keep the single-clause shape bare rather than wrapping it in a redundant
  // `bool.should`, so existing callers produce a byte-identical filter.
  if (shouldClauses.length === 1) {
    return shouldClauses[0];
  }

  return { bool: { should: shouldClauses } };
};
