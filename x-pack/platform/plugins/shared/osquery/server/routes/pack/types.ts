/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RRuleScheduleConfig, ScheduleType } from '../../../common';
import type { ResultType } from '../../../common/result_type';
import type { SOShard } from '../../common/types';
import type { PackQueryInput } from './utils';

export interface PackResponseData {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: PackQueryInput[];
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by: string | undefined;
  updated_by_profile_uid?: string;
  policy_ids?: string[];
  shards?: SOShard;
  read_only?: boolean;
  /** Pack-level schedule type (discriminated read response). */
  schedule_type?: ScheduleType;
  /** Pack-level interval (seconds) — present only when `schedule_type === 'interval'`. */
  interval?: number;
  /** Pack-level RRULE schedule — present only when `schedule_type === 'rrule'`. */
  rrule_schedule?: RRuleScheduleConfig;
  /** V5: Pack-level minimum osquery version default. */
  min_osquery_version?: string;
  /** V5: Pack-level result type default. */
  result_type?: ResultType;
  /** V5: Pack-level platform (OS) default. */
  platform?: string;
}

export interface ReadPackResponseData {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Record<string, PackQueryInput>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by: string | undefined;
  updated_by_profile_uid?: string;
  policy_ids?: string[];
  shards: Record<string, number>;
  read_only?: boolean;
  type: string;
  namespaces?: string[];
  migrationVersion?: Record<string, string>;
  managed?: boolean;
  coreMigrationVersion?: string;
  /** Pack-level schedule type (discriminated read response). */
  schedule_type?: ScheduleType;
  /** Pack-level interval (seconds) — present only when `schedule_type === 'interval'`. */
  interval?: number;
  /** Pack-level RRULE schedule — present only when `schedule_type === 'rrule'`. */
  rrule_schedule?: RRuleScheduleConfig;
  /** V5: Pack-level minimum osquery version default. */
  min_osquery_version?: string;
  /** V5: Pack-level result type default. */
  result_type?: ResultType;
  /** V5: Pack-level platform (OS) default. */
  platform?: string;
}
