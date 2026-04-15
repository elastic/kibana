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

export const RESULTS_DATA_STREAM_INDEX = `logs-${OSQUERY_INTEGRATION_NAME}.results`;

export const DEFAULT_PLATFORM = 'linux,windows,darwin';

export const OSQUERY_SCHEDULED_INPUT_TYPE = 'osquery_scheduled';

export const CASE_ATTACHMENT_TYPE_ID = 'osquery';

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v1: '1',
  },
};

export const OSQUERY_SCHEMA_API_ROUTE = '/internal/osquery/schemas/osquery';
export const ECS_SCHEMA_API_ROUTE = '/internal/osquery/schemas/ecs';

export const FALLBACK_OSQUERY_VERSION = '5.19.0';
export const FALLBACK_ECS_VERSION = '9.2.0';

/** Cache Fleet installation version lookups to avoid a SavedObjects read on every schema request. */
export const OSQUERY_PACKAGE_INSTALLATION_CACHE_TTL_MS = 60_000;

/**
 * How long osqueryd on the agent is allowed to execute a single query.
 * Validated server-side via inRangeRt() in @kbn/osquery-io-ts-types and client-side in timeout_field.tsx.
 * The max of 24h matches what osquerybeat actually supports.
 */
export enum QUERY_TIMEOUT {
  DEFAULT = 60,
  MAX = 86400,
}

/**
 * How long Fleet Server holds an undelivered action for offline agents.
 * Agents that check in within this window will receive the query; after that, the action expires.
 * Set to 2 weeks to match endpoint response actions (isolate/release) and cover
 * extended offline periods (weekends, travel, intermittent connectivity).
 */
export const ACTION_EXPIRATION_WEEKS = 2;

export const MAX_TAGS_PER_ACTION = 20;
export const MAX_TAG_LENGTH = 256;
