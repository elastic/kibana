/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The time unit used for a heartbeat interval.
 */
export type HeartbeatIntervalUnit = 'minutes' | 'hours' | 'days';

/**
 * Whether a heartbeat is currently active (firing) or paused.
 */
export type HeartbeatStatus = 'active' | 'paused';

/**
 * A heartbeat attached to an agent.
 * When active, the configured prompt is sent to the agent on the configured
 * recurring interval, always within the same dedicated conversation thread.
 */
export interface AgentHeartbeat {
  id: string;
  /** The agent this heartbeat belongs to. */
  agent_id: string;
  /** Human-readable label for this heartbeat. */
  name: string;
  /** The prompt sent to the agent on each beat. */
  prompt: string;
  /** Number of interval units between beats (e.g. 15). */
  interval_value: number;
  /** The time unit for the interval (e.g. 'minutes'). */
  interval_unit: HeartbeatIntervalUnit;
  /**
   * ISO8601 timestamp of when the first beat should fire.
   * Omit (or set to now/past) to start immediately.
   */
  start_time?: string;
  /** Whether the heartbeat is actively scheduled or paused. */
  status: HeartbeatStatus;
  /** The dedicated conversation thread for this heartbeat. Created at heartbeat creation. */
  conversation_id: string;
  /** ISO8601 timestamp of the most recent successful beat execution. */
  last_executed_at?: string;
  /** Error message from the most recent failed beat, if any. */
  last_error?: string;
  /** ISO8601 timestamp of when this heartbeat was created. */
  created_at: string;
  /** ISO8601 timestamp of the most recent update. */
  updated_at: string;
}

/**
 * Request body for creating a heartbeat.
 */
export type HeartbeatCreateRequest = Pick<
  AgentHeartbeat,
  'name' | 'prompt' | 'interval_value' | 'interval_unit'
> & { start_time?: string };

/**
 * Request body for updating a heartbeat. All fields are optional.
 */
export type HeartbeatUpdateRequest = Partial<
  Pick<AgentHeartbeat, 'name' | 'prompt' | 'interval_value' | 'interval_unit' | 'start_time'>
>;

/** Minimum allowed interval in minutes (1 minute). */
export const HEARTBEAT_MIN_INTERVAL_MINUTES = 1;

/** Maximum allowed interval in minutes (30 days). */
export const HEARTBEAT_MAX_INTERVAL_MINUTES = 30 * 24 * 60;

/**
 * Converts a heartbeat's interval to total minutes for validation.
 */
export const toTotalMinutes = (
  intervalValue: number,
  intervalUnit: HeartbeatIntervalUnit
): number => {
  switch (intervalUnit) {
    case 'minutes':
      return intervalValue;
    case 'hours':
      return intervalValue * 60;
    case 'days':
      return intervalValue * 24 * 60;
  }
};

/**
 * Converts a heartbeat's interval to a Task Manager interval string (e.g. "15m", "2h", "1d").
 */
export const toTaskManagerInterval = (
  intervalValue: number,
  intervalUnit: HeartbeatIntervalUnit
): string => {
  const unitMap: Record<HeartbeatIntervalUnit, string> = {
    minutes: 'm',
    hours: 'h',
    days: 'd',
  };
  return `${intervalValue}${unitMap[intervalUnit]}`;
};
