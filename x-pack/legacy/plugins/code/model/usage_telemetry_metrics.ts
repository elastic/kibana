/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum CodeUsageMetrics {
  ENABLED = 'enabled',
  REPOSITORIES = 'repositories',
  LANGUAGE_SERVERS = 'langserver',
}

export enum CodeUIUsageMetrics {
  ADMIN_PAGE_LOAD_COUNT = 'adminPageLoadCount',
  SOURCE_VIEW_PAGE_LOAD_COUNT = 'sourceViewPageLoadCount',
  SEARCH_PAGE_LOAD_COUNT = 'searchPageLoadCount',
  FILE_TREE_CLICK_COUNT = 'fileTreeClickCount',
  BREADCRUMB_CLICK_COUNT = 'breadcrumbClickCount',
  LINE_NUMBER_CLICK_COUNT = 'lineNumberClickCount',
  STRUCTURE_TREE_CLICK_COUNT = 'structureTreeClickCount',
  LSP_DATA_AVAILABLE_PAGE_VIEW_COUNT = 'lspDataAvailablePageViewCount',
}
