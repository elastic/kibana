/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import type { EuiThemeComputed, Query } from '@elastic/eui';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';
import { streamsInMemorySearchBarCompressedFiltersCss } from './streams_in_memory_search_bar_compressed_filters';

/** No collapsed parents — use for views that always show the full tree (e.g. canvas). */
export const MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED: ReadonlySet<string> = new Set();

export function filterMockAwsStreamsBySearchQuery(
  rows: readonly AwsMockStreamRow[],
  searchQuery: Query | undefined,
  collapsed: ReadonlySet<string>
): AwsMockStreamRow[] {
  const textSearch = searchQuery?.text?.toLowerCase() ?? '';
  const qualityFilters =
    searchQuery?.ast?.clauses?.filter(
      (c) => c.type === 'field' && (c as { field?: string }).field === 'quality'
    ) ?? [];

  const visible: AwsMockStreamRow[] = [];
  for (const row of rows) {
    if (textSearch && !row.name.toLowerCase().includes(textSearch)) continue;
    if (row.parentName && collapsed.has(row.parentName)) continue;
    if (
      qualityFilters.length > 0 &&
      !qualityFilters.some(
        (f) => 'value' in f && typeof f.value === 'string' && f.value === row.quality
      )
    )
      continue;
    visible.push(row);
  }
  return visible;
}

export function streamsDemoSearchToolbarLayoutCss(euiTheme: EuiThemeComputed) {
  return css`
    ${streamsInMemorySearchBarCompressedFiltersCss(euiTheme)}
    /*
     * EuiSearchBar renders an EuiFlexGroup with wrap=true (no .euiSearchBar class).
     * Target that group via the search holder child so toolsRight stays on one row.
     */
    & .euiFlexGroup:has(.euiSearchBar__searchHolder) {
      flex-wrap: nowrap !important;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
    }
    /* Default min-width on the search cell forces toolsRight onto a second row */
    & .euiSearchBar__searchHolder {
      min-width: 0 !important;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 6rem;
    }
    & .euiSearchBar__filtersHolder {
      flex-shrink: 0;
    }
    & .euiFlexGroup:has(.euiSearchBar__searchHolder) > .euiFlexItem:last-of-type {
      flex-shrink: 0;
    }
    & .kbnQueryBar {
      flex-wrap: nowrap !important;
      align-items: center;
    }
    & .uniSearchBar {
      min-width: 0;
    }
  `;
}
