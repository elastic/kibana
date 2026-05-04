/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RRuleScheduleConfig, ScheduleType } from '../../common';
import type { Shard } from '../../common/utils/converters';
import type { PackQueryFormData } from './queries/use_pack_query_form';

export interface PackSavedObject {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Record<string, Omit<PackQueryFormData, 'id'>>;
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
   * Pack-level schedule type discriminator. Absent on legacy packs (per-query
   * interval behavior). Present once a pack has been saved with the RRULE
   * scheduling feature flag enabled.
   */
  schedule_type?: ScheduleType;
  /**
   * Pack-level interval (seconds). Set when `schedule_type === 'interval'`.
   * Mutually exclusive with `rrule_schedule`.
   */
  interval?: number;
  /**
   * Pack-level RRULE config. Set when `schedule_type === 'rrule'`. Mutually
   * exclusive with `interval`.
   */
  rrule_schedule?: RRuleScheduleConfig;
}

export type PackItem = PackSavedObject & {
  id: string;
  policy_ids: string[];
  read_only?: boolean;
  shards?: Shard;
};
