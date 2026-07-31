/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// apiClient prefixes the Kibana base URL, so paths are relative (no leading slash).
export const API_BASE_PATH = 'api/cross_cluster_replication';

// A distinct self-referential remote per spec, so the two suites don't clash on
// the shared cluster-global `cluster.remote.*` setting.
export const AUTO_FOLLOW_REMOTE_CLUSTER = 'ccr-scout-api-auto-follow-remote';
export const FOLLOWER_REMOTE_CLUSTER = 'ccr-scout-api-follower-remote';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

// Local copy of the plugin's `FOLLOWER_INDEX_ADVANCED_SETTINGS`; keep in sync.
export const FOLLOWER_INDEX_ADVANCED_SETTINGS = {
  maxReadRequestOperationCount: 5120,
  maxOutstandingReadRequests: 12,
  maxReadRequestSize: '32mb',
  maxWriteRequestOperationCount: 5120,
  maxWriteRequestSize: '9223372036854775807b',
  maxOutstandingWriteRequests: 9,
  maxWriteBufferCount: 2147483647,
  maxWriteBufferSize: '512mb',
  maxRetryDelay: '500ms',
  readPollTimeout: '1m',
};
