/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TAG_FILTER_ID,
  type ActiveFilters,
  type IncludeExcludeFilter,
} from '@kbn/content-list-provider';
import { buildRulesListFilter } from './utils';

/** Filter dimension key for the enabled/disabled status filter. */
export const ENABLED_FILTER_ID = 'enabled';

/** Filter dimension key for the rule kind (mode) filter. */
export const KIND_FILTER_ID = 'kind';

export { TAG_FILTER_ID };

export interface RulesQueryParams {
  /** KQL filter string for list-rules / by-query bulk APIs. */
  filter?: string;
  /** Free-text search string for list-rules / by-query bulk APIs. */
  search?: string;
}

/**
 * Maps Content List {@link ActiveFilters} onto the filter/search params shared by
 * the rules list fetch and by-query bulk actions. Both call sites must use this
 * mapper so select-all never targets a different set than the table shows.
 *
 * Enabled filter values are `'true'` / `'false'` (matching the rules status
 * filter UI). Kind filter values are `'alert'` / `'signal'`.
 *
 * Narrows filter dimensions with a cast (same pattern as action policies) because
 * `getIncludeExcludeFilter` is not part of `@kbn/content-list-provider`'s public
 * export surface.
 */
export const toRulesQueryParams = (filters: ActiveFilters): RulesQueryParams => {
  const enabled = filters[ENABLED_FILTER_ID] as IncludeExcludeFilter | undefined;
  const kind = filters[KIND_FILTER_ID] as IncludeExcludeFilter | undefined;
  const tags = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;

  return {
    filter: buildRulesListFilter({
      enabled: enabled?.include?.[0],
      kind: kind?.include?.[0],
      tags: tags?.include,
    }),
    search: filters.search || undefined,
  };
};
