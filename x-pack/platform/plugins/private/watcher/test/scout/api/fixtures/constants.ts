/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const WATCHER_API_TAGS = ['@local-stateful-classic', '@cloud-stateful-classic'];

export const API_PATHS = {
  INDEX_PATTERNS: 'api/watcher/indices/index_patterns',
  DATA_VIEWS: 'api/data_views/data_view',
  DATA_VIEW_BY_ID: (id: string) => `api/data_views/data_view/${id}`,
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
};

/** Minimum Kibana privileges needed to call GET /api/watcher/indices/index_patterns. */
export const WATCHER_API_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

export const DATA_VIEW_TITLE = 'ft_ecommerce';
export const DATA_VIEW_TIME_FIELD = 'order_date';
