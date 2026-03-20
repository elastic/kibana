/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// History table & filters (queryHistoryRework)
export const UNIFIED_HISTORY_TABLE = 'unifiedHistoryTable';
export const HISTORY_SEARCH_INPUT = 'history-search-input';
export const HISTORY_DATE_PICKER = 'history-date-picker';
export const HISTORY_RUN_BY_FILTER = 'history-run-by-filter-button';
export const HISTORY_SOURCE_FILTER = 'history-source-filter-button';
export const HISTORY_TAGS_FILTER = 'history-tags-filter-button';
export const UNIFIED_HISTORY_PAGINATION = 'unified-history-pagination';

// Unified data table results (unifiedDataTable)
export const RESULTS_PANEL = 'osqueryResultsPanel';
export const RESULTS_TABLE = 'osqueryResultsTable';
export const RESULTS_FLYOUT = 'osqueryResultsFlyout';

// Saved queries list (queryHistoryRework)
export const SAVED_QUERIES_TABLE = 'savedQueriesTable';
export const SAVED_QUERIES_SEARCH = 'saved-queries-toolbar-search';
export const SAVED_QUERIES_CREATED_BY = 'saved-queries-toolbar-created-by-button';
export const SAVED_QUERIES_COLUMNS = 'saved-queries-toolbar-columns-button';
export const SAVED_QUERIES_SORT = 'saved-queries-toolbar-sort-button';

// Row actions menu (kebab) — used by packs and saved queries
export const rowActionsMenuSelector = (itemName: string) =>
  `[aria-label="Actions for ${itemName}"]`;
