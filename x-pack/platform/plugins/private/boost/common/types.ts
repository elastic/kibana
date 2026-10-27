/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Profile and rule shapes mirror the Elasticsearch `_boost` API responses.

export type BoostProfileType = 'indices' | 'data_streams';

export type HighAvailability = 'one_extra_copy' | 'none';

export interface BoostPeriod {
  min_boost: number;
  max_boost: number;
  max_age?: string;
}

interface BoostProfileBase {
  name: string;
  is_builtin: boolean;
}

export interface IndicesBoostProfile extends BoostProfileBase {
  type: 'indices';
  min_boost: number;
  max_boost: number;
  high_availability: HighAvailability;
  prewarm: boolean;
  pinned: boolean;
}

export interface DataStreamsBoostProfile extends BoostProfileBase {
  type: 'data_streams';
  recent: BoostPeriod;
  standard: BoostPeriod;
  background: BoostPeriod;
}

export type BoostProfile = IndicesBoostProfile | DataStreamsBoostProfile;

/** Profile payload for create and update requests; the server sets `is_builtin`. */
export type BoostProfileInput =
  | Omit<IndicesBoostProfile, 'is_builtin'>
  | Omit<DataStreamsBoostProfile, 'is_builtin'>;

export interface BoostRule {
  name: string;
  /**
   * What the rule applies to: one index pattern (a name or a `*` pattern), or a list of picked
   * index or data stream names. Elasticsearch accepts a single `index_pattern` per rule today, so
   * this assumes multi-pattern support.
   */
  index_patterns: string[];
  boost_profile: string;
  priority: number;
  is_builtin: boolean;
}

/** Rule payload for create and update requests; the server sets `is_builtin`. */
export type BoostRuleInput = Omit<BoostRule, 'is_builtin'>;

export type IndicesPresetId = 'on_demand' | 'performant' | 'high_availability';

export type DataStreamsWindowId = 'last_1_day' | 'last_3_days' | 'last_7_days';

/**
 * The profiles the two default rules use, which are the project's defaults: an Elastic-managed
 * preset, or a custom profile of the same type.
 */
export interface DefaultRuleProfiles {
  indices_profile: string;
  data_streams_profile: string;
}

export interface BoostSettings {
  default_profiles: DefaultRuleProfiles;
  updated_at?: string;
}

export type DataSourceType = 'index' | 'data_stream';

/** Part of a data stream's data, such as one backing index, by how old its newest data is. */
export interface BoostDataAge {
  /** Hours since the newest data in this part was written; 0 for the write index. */
  age_hours: number;
  size_in_bytes: number;
}

/** A regular index or data stream in the project that boost rules can apply to. */
export interface BoostDataLifecycle {
  enabled: boolean;
  data_retention?: string;
}

export interface BoostDataSource {
  name: string;
  type: DataSourceType;
  /** Dataset size, or 0 when Elasticsearch doesn't report one. */
  size_in_bytes: number;
  /**
   * Whether it's hidden, such as Kibana's own data. Boost rules apply to it all the same, but lists
   * leave it out unless asked to include hidden ones.
   */
  hidden?: boolean;
  /**
   * A data stream's lifecycle, when it has one: whether it's on, and how long it keeps data, such as
   * `30d`. Without a retention, it keeps data indefinitely.
   */
  lifecycle?: BoostDataLifecycle;
  /** A data stream's data by age, which decides the boost period each part is in. */
  data_ages?: BoostDataAge[];
}

/**
 * How boost rules apply to one index or data stream, as Elasticsearch's explain API reports it: the
 * profile that applies, if any, and every rule that matches, with the one that applies first.
 */
export interface BoostExplanation {
  boost_profile?: string;
  matches: BoostRule[];
}

export interface BoostState {
  settings: BoostSettings;
  profiles: BoostProfile[];
  /** The custom rules, highest priority first, then the two default rules. */
  rules: BoostRule[];
  data_sources: BoostDataSource[];
}
