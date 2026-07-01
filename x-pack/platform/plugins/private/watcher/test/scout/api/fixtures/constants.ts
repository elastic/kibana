/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const API_PATHS = {
  INDEX_PATTERNS: 'api/watcher/indices/index_patterns',
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
};

/**
 * Minimum Kibana privileges needed to call GET /api/watcher/indices/index_patterns.
 * The route has authz disabled and relies on the saved objects client, which requires
 * read access to 'index-pattern' saved objects.
 */
export const WATCHER_API_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: { indexPatterns: ['read'] },
      spaces: ['*'],
    },
  ],
};

export const DATA_VIEW_TITLE = 'scout-watcher-api-test';
