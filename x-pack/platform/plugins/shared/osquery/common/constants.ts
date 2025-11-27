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
export const RESULTS_DATA_STREAM_INDEX = `logs-${OSQUERY_INTEGRATION_NAME}.result`;

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

/**
 * Action expiration timeout configuration.
 * This controls how long Kibana waits for all agents to respond.
 */
export const ACTION_EXPIRATION = {
  /** Minimum timeout in minutes (for small queries on few agents) */
  MIN_MINUTES: 5,
  /** Maximum timeout in minutes (cap to prevent excessively long waits) */
  MAX_MINUTES: 50,
  /** Buffer added to query timeout to account for Fleet delivery delays */
  BUFFER_MINUTES: 2,
  /** Minutes added per 1000 agents to account for Fleet batching */
  MINUTES_PER_1K_AGENTS: 2,
  /**
   * Search window for querying results (must be >= MAX_MINUTES + buffer).
   * Used in ES queries to filter results by time range from action start.
   */
  SEARCH_WINDOW_MINUTES: 55,
} as const;

/**
 * Calculates dynamic action expiration timeout based on query complexity and agent count.
 *
 * The timeout is the maximum of:
 * 1. Query timeout + buffer (to ensure query has time to complete)
 * 2. Scaled agent count (to account for Fleet distribution delays)
 * 3. Minimum timeout (to handle edge cases)
 *
 * @param queryTimeoutSeconds - Maximum query timeout in seconds (default 60)
 * @param agentCount - Number of agents targeted
 * @returns Timeout in minutes, capped at MAX_MINUTES
 *
 * @example
 * // 100 agents, 60s query → 5 min (minimum)
 * // 5000 agents, 60s query → 10 min (agent scaling)
 * // 100 agents, 10min query → 12 min (query timeout + buffer)
 * // 50000 agents, 60s query → 50 min (capped at max)
 */
export const calculateActionExpirationMinutes = (
  queryTimeoutSeconds: number = QUERY_TIMEOUT.DEFAULT,
  agentCount: number
): number => {
  if (queryTimeoutSeconds < 0 || queryTimeoutSeconds > QUERY_TIMEOUT.MAX) {
    throw new Error(
      `Invalid queryTimeoutSeconds: ${queryTimeoutSeconds}. Must be between 0 and ${QUERY_TIMEOUT.MAX}`
    );
  }

  if (agentCount < 0) {
    throw new Error(`Invalid agentCount: ${agentCount}. Must be >= 0`);
  }

  const queryTimeoutMinutes = Math.ceil(queryTimeoutSeconds / 60);

  const fromQueryTimeout = queryTimeoutMinutes + ACTION_EXPIRATION.BUFFER_MINUTES;
  const fromAgentCount = Math.ceil(agentCount / 1000) * ACTION_EXPIRATION.MINUTES_PER_1K_AGENTS;

  return Math.min(
    ACTION_EXPIRATION.MAX_MINUTES,
    Math.max(fromQueryTimeout, fromAgentCount, ACTION_EXPIRATION.MIN_MINUTES)
  );
};
