/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { buildSpaceIdFilter } from '../../utils/build_space_id_filter';

/**
 * Mandatory, centralized space scoping for every osquery search-strategy query.
 *
 * This is a SECURITY choke point. It injects the `space_id` filter into the
 * top-level `query.bool.filter` of the DSL produced by any factory builder, so
 * that all osquery ES reads — current and future factory types — are scoped to
 * the caller's active space even if an individual DSL builder forgets to add
 * the filter. It is fail-closed: `spaceId` is required and a clause is always
 * added.
 *
 * Note on the "spaceId is applied twice" appearance at the dispatch site: the
 * `action_results` and `scheduled_action_results` builders compute their count
 * aggregations inside a `global` aggregation, which by ES semantics IGNORES the
 * top-level `query` filter this helper scopes. The hit context and that global
 * aggregation context are therefore two independent filter scopes — this helper
 * cannot reach the latter, so those builders inject `buildSpaceIdFilter(spaceId)`
 * into the aggregation's own filter as well. Same value, two distinct controls:
 * this one scopes the returned hits (`_source`), the builder scopes the counts
 * (`rows_count` / responded / success / error) so they match the hits.
 */
export const enforceSpaceScope = (
  dsl: ISearchRequestParams,
  spaceId: string
): ISearchRequestParams => {
  const spaceIdFilter = buildSpaceIdFilter(spaceId);

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
