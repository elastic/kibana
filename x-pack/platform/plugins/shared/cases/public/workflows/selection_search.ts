/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';

/** Maximum number of source rows scanned in browse mode (empty query) for selection search. */
export const SELECTION_SEARCH_MAX_BROWSE_RESULTS = 15;

export interface CollectSelectionSearchOptionsParams<TItem> {
  readonly items: readonly TItem[];
  /** True when the trimmed search string is empty (browse mode). */
  hasEmptyQuery: boolean;
  /**
   * Return true if `item` matches the non-empty search text.
   * When `hasEmptyQuery` is true, the implementation short-circuits and does not invoke this.
   */
  matchesQuery: (item: TItem) => boolean;
  toOption: (item: TItem) => SelectionOption<string>;
}

/**
 * Builds completion options for workflow selection `search` handlers.
 *
 * An item is included when `hasEmptyQuery` **or** `matchesQuery(item)`.
 *
 * When `hasEmptyQuery` is true (browse), only the first {@link SELECTION_SEARCH_MAX_BROWSE_RESULTS}
 * **sources** are scanned; each is included. When `hasEmptyQuery` is false (filter), **all**
 * sources are scanned so matches are not missed past that browse cap.
 */
export const collectSelectionSearchOptions = <TItem>({
  items,
  hasEmptyQuery,
  matchesQuery,
  toOption,
}: CollectSelectionSearchOptionsParams<TItem>): SelectionOption<string>[] => {
  const limit = hasEmptyQuery
    ? Math.min(items.length, SELECTION_SEARCH_MAX_BROWSE_RESULTS)
    : items.length;
  const options: SelectionOption<string>[] = [];

  for (let i = 0; i < limit; i++) {
    const item = items[i];
    if (hasEmptyQuery || matchesQuery(item)) {
      options.push(toOption(item));
    }
  }

  return options;
};
