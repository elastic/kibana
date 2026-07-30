/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// apiClient prefixes the Kibana base URL, so paths are relative (no leading slash).
export const API_BASE_PATH = 'api/cross_cluster_replication';

// Self-referential remote cluster names for the single-cluster CCR setup. Each
// spec owns a distinct remote so the two suites never contend over the same
// cluster-global `cluster.remote.*` persistent setting, even if run concurrently.
export const AUTO_FOLLOW_REMOTE_CLUSTER = 'ccr-scout-api-auto-follow-remote';
export const FOLLOWER_REMOTE_CLUSTER = 'ccr-scout-api-follower-remote';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
