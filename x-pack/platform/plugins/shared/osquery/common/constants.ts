/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000;
export const OSQUERY_INTEGRATION_NAME = 'osquery_manager';

export const MAX_OFFSET_RESULTS = 10000;
export const PIT_KEEP_ALIVE = '10m';

/**
 * Maximum offset allowed for PIT-based deep pagination.
 * Prevents excessive batch fetching that could exhaust memory.
 * 100,000 documents = 1000 pages of 100 results each.
 */
export const MAX_PIT_OFFSET = 100000;

/**
 * Maximum length of pitId parameter (PIT IDs are typically ~200-500 chars base64).
 * Prevents abuse through extremely large request payloads.
 */
export const MAX_PIT_ID_LENGTH = 2048;

/**
 * Maximum size of searchAfter parameter in bytes.
 * Sort values should be compact primitives, 1KB is generous.
 */
export const MAX_SEARCH_AFTER_SIZE = 1024;

/**
 * Maximum number of sort fields in searchAfter array.
 * Typical sorts have 1-3 fields, 10 is generous.
 */
export const MAX_SORT_FIELDS = 10;
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
