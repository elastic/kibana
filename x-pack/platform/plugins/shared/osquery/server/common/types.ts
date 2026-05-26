/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RRuleScheduleConfig, ScheduleType } from '../../common';

export interface IQueryPayload {
  name: string;
  id: string;
}

export type SOShard = Array<{ key: string; value: number }>;

export interface PackSavedObject {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Array<{
    id: string;
    name: string;
    query: string;
    /**
     * Per-query interval (seconds) for interval-mode queries. Optional because
     * queries that opt into `schedule_type: 'rrule'` intentionally omit
     * `interval` per `convertPackQueriesToSO`'s mutual-exclusivity logic.
     */
    interval?: number;
    timeout?: number;
    snapshot?: boolean;
    removed?: boolean;
    schedule_id?: string;
    start_date?: string;
    ecs_mapping?: Record<string, unknown>;
    /** Per-query schedule type override. Mutually exclusive with sibling fields per type. */
    schedule_type?: ScheduleType;
    /** Per-query RRULE schedule override. Only present when `schedule_type === 'rrule'`. */
    rrule_schedule?: RRuleScheduleConfig;
  }>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by: string | undefined;
  updated_by_profile_uid?: string;
  policy_ids?: string[];
  read_only?: boolean;
  shards: SOShard;
  references: Array<{ name: string; type: string; id: string }>;
  /**
   * Pack-level schedule type. When absent, no pack-level schedule is set:
   * each query supplies its own per-query `interval` and there is no default
   * to inherit. Interval and rrule are equal-class modes — neither is the
   * default.
   *
   * Nullable because routes clear the prior-mode pack-level field
   * on a schedule_type transition. `packSchemaV3` accepts `null`
   * for all three pack-level scheduling fields.
   */
  schedule_type?: ScheduleType | null;
  /**
   * Pack-level interval (seconds) — the default each query inherits when the
   * pack runs in interval mode. Only present when `schedule_type === 'interval'`.
   * Nullable to support the mode-transition clear.
   */
  interval?: number | null;
  /**
   * Pack-level RRULE schedule. Only present when `schedule_type === 'rrule'`.
   * The server stamps this onto each query that has no individual override.
   * Nullable to support the mode-transition clear.
   */
  rrule_schedule?: RRuleScheduleConfig | null;
}

export interface SavedQuerySavedObject {
  id: string;
  description: string | undefined;
  query: string;
  interval: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform: string;
  ecs_mapping?: Array<{ key: string; value: Record<string, object> }>;
  created_at: string;
  created_by: string | undefined;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by: string | undefined;
  updated_by_profile_uid?: string;
  prebuilt?: boolean;
  version: number;
}

export interface HTTPError extends Error {
  statusCode: number;
}
