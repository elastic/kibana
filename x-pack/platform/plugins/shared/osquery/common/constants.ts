/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000;
export const OSQUERY_INTEGRATION_NAME = 'osquery_manager';
export const BASE_PATH = '/app/osquery';

export const OSQUERY_LOGS_BASE = `.logs-${OSQUERY_INTEGRATION_NAME}`;
export const ACTIONS_INDEX = `${OSQUERY_LOGS_BASE}.actions`;
export const RESULTS_INDEX = `${OSQUERY_LOGS_BASE}.results`;
export const OSQUERY_ACTIONS_INDEX = `${ACTIONS_INDEX}-*`;

export const ACTION_RESPONSES_INDEX = `.logs-${OSQUERY_INTEGRATION_NAME}.action.responses`;
export const ACTION_RESPONSES_DATA_STREAM_INDEX = `logs-${OSQUERY_INTEGRATION_NAME}.action.responses`;

export const DEFAULT_PLATFORM = 'linux,windows,darwin';

export const CASE_ATTACHMENT_TYPE_ID = 'osquery';

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v1: '1',
  },
};

export enum QUERY_TIMEOUT {
  DEFAULT = 60, // 60 seconds
  MAX = 60 * 60 * 24, // 24 hours
}

// =============================================================================
// ENDPOINT ASSETS (CAASM) CONSTANTS
// =============================================================================

export const ENDPOINT_ASSETS_INDEX_PREFIX = 'endpoint-assets-osquery';
export const ENDPOINT_ASSETS_TRANSFORM_PREFIX = 'endpoint-assets-osquery-';
export const ENDPOINT_ASSETS_PIPELINE_PREFIX = 'endpoint-assets-ingest-';

export const ENDPOINT_ASSETS_DEFAULT_NAMESPACE = 'default';

export const ENDPOINT_ASSETS_TRANSFORM_FREQUENCY = '5m';
export const ENDPOINT_ASSETS_TRANSFORM_DELAY = '0s';

/**
 * Index pattern for endpoint assets - used for Entity Store integration
 * Pattern matches: endpoint-assets-osquery-{namespace}
 * Example: endpoint-assets-osquery-default
 */
export const ENDPOINT_ASSETS_INDEX_PATTERN = `${ENDPOINT_ASSETS_INDEX_PREFIX}-*`;

export const ENDPOINT_ASSETS_ENTITY_TYPE = {
  HOST: 'host',
} as const;

export const ENDPOINT_ASSETS_ENTITY_SUB_TYPE = {
  ENDPOINT: 'endpoint',
} as const;

export const ENDPOINT_ASSETS_ENTITY_SOURCE = {
  OSQUERY: 'osquery',
} as const;

/**
 * Elasticsearch cluster privileges required for endpoint assets management
 */
export const ENDPOINT_ASSETS_REQUIRED_ES_PRIVILEGES = [
  'manage_index_templates',
  'manage_transform',
  'manage_ingest_pipelines',
] as const;
