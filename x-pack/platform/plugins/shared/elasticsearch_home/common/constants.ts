/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'elasticsearchHome';

/**
 * Elasticsearch currently reports dense vector `value_count` as 0 on stateless
 * (https://github.com/elastic/elasticsearch/pull/158563), so this stat is
 * misleading. Keep the fetch and UI paths intact but disabled until we have a
 * replacement.
 */
export const VECTOR_COUNT_ENABLED = false;

export const DEPLOYMENT_STATS_PATH = '/internal/elasticsearch_home/deployment_stats';
export const STARRED_DASHBOARDS_COUNT_PATH =
  '/internal/elasticsearch_home/starred_dashboards_count';
export const WORKFLOWS_STATS_PATH = '/api/workflows/stats';

/**
 * Elasticsearch feature capability exposing the index `monitor` privilege, so the home page can
 * decide whether to render the vector count tile before the stats request resolves. The feature is
 * registered under `PLUGIN_ID`, so this reads as
 * `capabilities.elasticsearchHome.canMonitorAllIndices`.
 */
export const CAN_MONITOR_ALL_INDICES_CAPABILITY = 'canMonitorAllIndices';
