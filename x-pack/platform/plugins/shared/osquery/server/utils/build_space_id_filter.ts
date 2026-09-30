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
 * When `matchActionDataSpaceId` is enabled, that missing-field allowance also
 * requires `action_data.space_id` to be absent. A document carrying it was
 * emitted for a known space, so counting it as field-less would let the default
 * space read named-space results. The exclusion is deliberately tied to the
 * flag: a flag-off reader has no `action_data.space_id` clause to match such a
 * document with, so excluding it there would hide legitimate documents instead.
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
 * `true` from a read already bound to an `action_id`, and never on a read that
 * enumerates across actions.
 *
 * That id binding narrows the read to documents the caller named; it is not by
 * itself an authorization gate, because route-level ownership checks are uneven
 * (`get_action_results_route.ts` verifies the action document only when CPS is
 * active). What contains the blast radius is this clause: it matches only
 * documents whose surviving provenance already names the caller's active space,
 * so possessing another space's id yields nothing. The residual exposure is an
 * agent that forges `action_data.space_id`, which the top-level `must_not` below
 * limits to documents Kibana never stamped.
 *
 * This flag is orthogonal to `matchMissingSpaceId` and stays valid when it is
 * `false`: `action_data.space_id` is a present, exact-valued term carrying real
 * provenance, so it does not share the ambiguity of a missing field under CPS
 * fan-out. It is no worse than the top-level field — `my-space` in one project
 * still collides with `my-space` in a linked one, on either field. Do not
 * collapse the two.
 */
export const buildSpaceIdFilter = (
  spaceId: string,
  {
    matchMissingSpaceId = true,
    matchActionDataSpaceId = false,
  }: { matchMissingSpaceId?: boolean; matchActionDataSpaceId?: boolean } = {}
): estypes.QueryDslQueryContainer => {
  // Clauses are combined with `should`. ES defaults `minimum_should_match` to 1
  // only while a bool has no `must` and no `filter` clause — that is structural,
  // not a property of the surrounding context, and this bool carries `should` and
  // nothing else. Adding a `must` or `filter` here would flip the default to 0 and
  // make space scoping optional; `build_space_id_filter.test.ts` guards that.
  const shouldClauses: estypes.QueryDslQueryContainer[] = [{ term: { space_id: spaceId } }];

  if (spaceId === DEFAULT_SPACE_ID && matchMissingSpaceId) {
    shouldClauses.push({
      bool: {
        must_not: matchActionDataSpaceId
          ? [{ exists: { field: 'space_id' } }, { exists: { field: 'action_data.space_id' } }]
          : { exists: { field: 'space_id' } },
      },
    });
  }

  if (matchActionDataSpaceId) {
    // The Kibana-written top-level field wins where it exists: this fallback only
    // speaks for documents it never reached. Without the `must_not`, a document
    // stamped `space_id: 'space-b'` and `action_data.space_id: 'space-a'` would
    // match a space-A read even though the trusted field assigns it to B.
    shouldClauses.push({
      bool: {
        filter: { term: { 'action_data.space_id': spaceId } },
        must_not: { exists: { field: 'space_id' } },
      },
    });
  }

  // Keep the single-clause shape bare rather than wrapping it in a redundant
  // `bool.should`, so existing callers produce a byte-identical filter.
  if (shouldClauses.length === 1) {
    return shouldClauses[0];
  }

  return { bool: { should: shouldClauses } };
};
