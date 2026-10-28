/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum allowed splay duration in seconds (12 hours). Aligned with osquerybeat's
 * `MaxSplay = 12 * time.Hour` constant.
 */
export const MAX_SPLAY_SECONDS = 43200;

/**
 * Discriminator for which scheduling mode a pack or pack query uses.
 *
 * - `'interval'`: native osqueryd interval scheduling (seconds). Mutually
 *   exclusive with `rrule_schedule`.
 * - `'rrule'`: osquerybeat RRULE-based recurrence scheduling. Mutually
 *   exclusive with `interval`.
 *
 * Absence of the field on a pack means no pack-level schedule is set: each
 * query uses its own per-query `interval` and there is no default to inherit.
 */
export type ScheduleType = 'interval' | 'rrule';

/**
 * RRULE schedule configuration consumed by osquerybeat. The `rrule` field is
 * the fully serialized RFC 5545 string (e.g. `"FREQ=WEEKLY;BYDAY=MO,WE,FR"`),
 * not a structured object — osquerybeat's `teambition/rrule-go` parser speaks
 * strings directly. DTSTART is NOT included in the RRULE string; osquerybeat
 * uses the separate `start_date` field.
 */
export interface RRuleScheduleConfig {
  /** RFC 5545 RRULE string. */
  rrule: string;
  /** RFC 3339 datetime string for the schedule's start. Required. */
  start_date: string;
  /** Optional RFC 3339 datetime string for the schedule's end. */
  end_date?: string;
  /**
   * Optional Go duration string for splay (random execution delay).
   * Single-unit only on write: suffix `s` (seconds), `m` (minutes), or `h`
   * (hours) — e.g. `"30s"`, `"5m"`, `"1h"`. Compound durations like `"1h30m"`
   * are tolerated only on read (osquerybeat parses via `time.ParseDuration`
   * and may emit compound strings). Maximum 12 hours ({@link MAX_SPLAY_SECONDS}).
   */
  splay?: string;
  /**
   * Optional query execution timeout, in **seconds**. Field name is `timeout`
   * to match osquerybeat's wire field (`RRuleScheduleConfig.Timeout int`
   * in `elastic/beats#48767`). Default in beats is 60s when absent.
   */
  timeout?: number;
}
