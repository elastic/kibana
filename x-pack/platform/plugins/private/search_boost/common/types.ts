/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Profiles and rules mirror the Elasticsearch `_boost` API responses.

export type BoostProfileType = 'indices' | 'data_streams';

export type BoostAvailability = 'base' | 'one_extra_copy';

export interface BoostPeriod {
  min_boost: number;
  max_boost: number;
}

export interface BoostAgedPeriod extends BoostPeriod {
  max_age: string;
}

interface BoostProfileBase {
  name: string;
  is_builtin: boolean;
}

export interface IndicesBoostProfile extends BoostProfileBase {
  type: 'indices';
  min_boost: number;
  max_boost: number;
  availability: BoostAvailability;
  prewarm: boolean;
  pinned: boolean;
}

export interface DataStreamsBoostProfile extends BoostProfileBase {
  type: 'data_streams';
  recent: BoostAgedPeriod;
  standard: BoostAgedPeriod;
  background: BoostPeriod;
}

export type BoostProfile = IndicesBoostProfile | DataStreamsBoostProfile;

export interface BoostRule {
  name: string;
  /** An index or data stream name, or a pattern using `*`. */
  index_pattern: string;
  boost_profile: string;
  priority: number;
  is_builtin: boolean;
}

// Computed by Kibana, not returned by the `_boost` API.

export type DataRetention =
  | { type: 'value'; value: string; inMilliseconds: number }
  | { type: 'infinite' }
  | { type: 'disabled' };

/** An index or data stream that a boost rule matches. */
export interface BoostRuleMatch {
  name: string;
  isHidden: boolean;
  /** Name of the higher-ranked rule that applies to this match instead. */
  outrankedByRuleName?: string;
  storageSizeInBytes?: number;
  /** Data streams only. */
  retention?: DataRetention;
}

export interface BoostRuleListItem extends BoostRule {
  /** The type of the rule's profile. */
  type: BoostProfileType;
  matches: BoostRuleMatch[];
}
