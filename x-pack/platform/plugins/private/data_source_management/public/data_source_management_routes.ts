/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATA_SOURCE_MANAGEMENT_ROUTES = {
  list: '/',
  connect: '/connect',
  /** Legacy detail URL; redirects into the Data sets tab with filtering. */
  sourceDetail: '/source/:sourceId',
} as const;

/** Deep-link query keys for `/` stack-management routes (see `data_sources_page.tsx`). */
export const DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS = {
  dataSourceName: 'dataSourceName',
  /** Migrates bookmarks from `/source/{id}` until the id maps to the display name. */
  dataSourceId: 'dataSourceId',
} as const;
