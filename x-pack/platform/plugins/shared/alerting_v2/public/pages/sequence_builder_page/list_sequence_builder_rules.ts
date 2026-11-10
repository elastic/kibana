/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PER_PAGE, type FindRulesRequest } from '@kbn/alerting-v2-schemas';
import { toFindRulesRequest } from '../../hooks/use_fetch_rules';

/**
 * Hard ceiling for the Available rules panel: two pages, because the find API
 * rejects `per_page` above {@link MAX_PER_PAGE}. A larger `total` means the
 * panel is truncated and must say so. Do not raise this without paging or search.
 */
export const SEQUENCE_BUILDER_MAX_RULES = MAX_PER_PAGE * 2;

interface RulesPage<TItem> {
  items: readonly TItem[];
  total: number;
}

export interface SequenceBuilderRulesResult<TItem> {
  items: TItem[];
  /** Rules matching the query. Greater than `items.length` when the cap truncates the panel. */
  total: number;
}

/**
 * Loads rules for the sequence builder, paging at the find API's maximum page size.
 */
export const listSequenceBuilderRules = async <TItem>(
  listRules: (params: FindRulesRequest) => Promise<RulesPage<TItem>>
): Promise<SequenceBuilderRulesResult<TItem>> => {
  const items: TItem[] = [];
  const pageCount = SEQUENCE_BUILDER_MAX_RULES / MAX_PER_PAGE;
  let total = 0;

  for (let page = 1; page <= pageCount; page++) {
    const response = await listRules(
      toFindRulesRequest({
        page,
        perPage: MAX_PER_PAGE,
        sortField: 'name',
        sortOrder: 'asc',
      })
    );

    total = response.total;
    items.push(...response.items);

    if (items.length >= response.total || response.items.length < MAX_PER_PAGE) {
      break;
    }
  }

  return { items, total };
};
