/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { buildSpaceIdFilter } from '../../utils/build_space_id_filter';

/**
 * Centralizes the `space_id` filter for every osquery search-strategy query.
 *
 * It injects the `space_id` filter into the top-level `query.bool.filter` of the
 * DSL produced by any factory builder, so all osquery query types — current and
 * future — share one space-scoping implementation rather than repeating it per
 * builder.
 *
 * Note on the "spaceId is applied twice" appearance at the dispatch site: the
 * `action_results` and `scheduled_action_results` builders compute their count
 * aggregations inside a `global` aggregation, which by ES semantics ignores the
 * top-level `query` filter this helper scopes. The hit context and that global
 * aggregation context are therefore two independent filter scopes — this helper
 * cannot reach the latter, so those builders inject `buildSpaceIdFilter` with
 * the same flags this helper received. Same flags, two scopes: this one scopes
 * the returned hits (`_source`), the builder scopes the counts (`rows_count` /
 * responded / success / error) so they match the hits.
 *
 * `matchActionDataSpaceId` additionally matches the agent-carried
 * `action_data.space_id` (see {@link buildSpaceIdFilter}). It is only safe on
 * reads already bound to an `action_id` or `schedule_id`. The search strategy
 * enables it from `ID_BOUND_FACTORY_QUERY_TYPES` and passes that decision into
 * both this helper and `action_results` — the one global-agg builder on that
 * allowlist — so the two scopes cannot drift. `scheduled_action_results` is not
 * allowlisted and scopes its aggregation on the top-level field only.
 */
export const enforceSpaceScope = (
  dsl: ISearchRequestParams,
  spaceId: string,
  {
    matchMissingSpaceId = true,
    matchActionDataSpaceId = false,
  }: { matchMissingSpaceId?: boolean; matchActionDataSpaceId?: boolean } = {}
): ISearchRequestParams => {
  const spaceIdFilter = buildSpaceIdFilter(spaceId, {
    matchMissingSpaceId,
    matchActionDataSpaceId,
  });

  const query = (dsl.query ?? {}) as { bool?: { filter?: unknown } };
  const bool = (query.bool ?? {}) as { filter?: unknown };

  const existingFilter = Array.isArray(bool.filter)
    ? bool.filter
    : bool.filter != null
    ? [bool.filter]
    : [];

  return {
    ...dsl,
    query: {
      ...query,
      bool: {
        ...bool,
        filter: [...existingFilter, spaceIdFilter],
      },
    },
  };
};
