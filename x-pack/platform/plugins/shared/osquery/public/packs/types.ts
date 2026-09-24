/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { RRuleScheduleConfig, ScheduleType } from '../../common/schedule';
import type { ResultType } from '../../common/result_type';
import type { Shard } from '../../common/utils/converters';

/**
 * A pack query as returned by the read-pack API / stored on the SO.
 * Distinct from the flyout form shape, where `version` is `string[]`.
 */
export interface PackSavedObjectQuery {
  id?: string;
  query: string;
  interval?: number | string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  /** Comma-separated osquery version on the wire, never a form `string[]`. */
  version?: string;
  ecs_mapping?: ECSMapping;
  schedule_type?: ScheduleType;
  rrule_schedule?: RRuleScheduleConfig;
  enabled?: boolean;
  result_type?: ResultType;
  schedule_id?: string;
}

export interface PackSavedObject {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  /**
   * Per-query fields as returned by the read-pack API. `version` is a string
   * on the wire; the flyout form wraps it into `string[]`. The migration
   * advisory must not assume the form shape (`version[0]` on a string is the
   * first character).
   */
  queries: Record<string, PackSavedObjectQuery>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by: string | undefined;
  updated_by_profile_uid?: string;
  policy_ids: string[];
  references: Array<{ name: string; id: string; type: string }>;
  /**
   * Pack-level schedule type. When absent, no pack-level schedule is set and
   * each query uses its own per-query `interval`. Only emitted when the
   * `rruleScheduling` feature flag is on (D25).
   */
  schedule_type?: ScheduleType;
  /** Pack-level interval (seconds). Only present when `schedule_type === 'interval'`. */
  interval?: number;
  /** Pack-level RRULE schedule. Only present when `schedule_type === 'rrule'`. */
  rrule_schedule?: RRuleScheduleConfig;
  /** Pack-level minimum osquery version default. Fans out to queries that do not override. */
  min_osquery_version?: string;
  /** Pack-level result type default. Fans out to queries that do not override. */
  result_type?: ResultType;
  /**
   * Pack-level platform default (comma-separated osquery platform tokens).
   * Fans out to queries that do not override. Not a pack-level gate.
   */
  platform?: string;
}

export type PackItem = PackSavedObject & {
  id: string;
  policy_ids: string[];
  read_only?: boolean;
  shards?: Shard;
};

/**
 * Pack-level execution defaults as sent on the wire.
 *
 * The update route distinguishes three states: absent means "preserve the
 * stored value", `null` means "clear it", and a value means "set it". The
 * stored ({@link PackSavedObject}) shape has no use for `null`, so the
 * clearable form only exists at the request boundary.
 */
export interface ClearableExecutionDefaults {
  min_osquery_version?: string | null;
  result_type?: ResultType | null;
  platform?: string | null;
}
