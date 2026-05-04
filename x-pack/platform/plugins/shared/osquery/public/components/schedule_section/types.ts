/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Weekday } from '@kbn/rrule';
import type { ScheduleType } from '../../../common/schedule';
import type { SplayUnit } from '../../../common/utils/splay_utils';

/**
 * Discriminator for the high-level RRULE frequency choice exposed in the UI.
 * Maps to `@kbn/rrule` `Frequency` enum values, with `'custom'` representing a
 * weekly recurrence with explicit day selection (matches the mockup's "Custom"
 * option under "Date & time").
 */
export type ScheduleFrequency = 'minutely' | 'hourly' | 'daily' | 'custom' | 'monthly' | 'yearly';

/**
 * Local form-state shape consumed by the ScheduleSection components.
 *
 * Lives entirely in the UI layer: serialization to the API/SO shape (RFC 5545
 * RRULE string + Go duration splay) happens at the form→API boundary in the
 * pack form hooks. Keep all RRULE-structural fields flat so each sub-component
 * can bind via `useController({ name })` without nested-path gymnastics.
 */
export interface ScheduleFormData {
  schedule_type: ScheduleType;

  interval: number;

  start_date: string;
  end_date_enabled: boolean;
  end_date: string;

  splay_enabled: boolean;
  splay_value: number;
  splay_unit: SplayUnit;

  frequency: ScheduleFrequency;
  repeat_every: number;
  byweekday: Weekday[];
  bymonthday: number;
  bymonth: number;
}

/** Default per-query interval used for legacy interval-mode scheduling. */
export const DEFAULT_INTERVAL_SECONDS = 3600;

/** Default repeat count for `INTERVAL=` in custom (weekly) mode. */
export const DEFAULT_REPEAT_EVERY = 1;

/** Default splay magnitude (5 minutes) shown when the splay toggle flips on. */
export const DEFAULT_SPLAY_VALUE = 5;

/**
 * Static (date-free) defaults for ScheduleSection form state.
 *
 * Date fields are intentionally empty — the consuming form should populate
 * `start_date` (and optionally `end_date`) at mount time so SSR/CSR don't
 * disagree about "now" and so tests can pin time deterministically.
 */
export const DEFAULT_SCHEDULE_FORM_VALUES: ScheduleFormData = {
  schedule_type: 'interval',
  interval: DEFAULT_INTERVAL_SECONDS,

  start_date: '',
  end_date_enabled: false,
  end_date: '',

  splay_enabled: false,
  splay_value: DEFAULT_SPLAY_VALUE,
  splay_unit: 'minutes',

  frequency: 'daily',
  repeat_every: DEFAULT_REPEAT_EVERY,
  byweekday: [Weekday.MO, Weekday.TU, Weekday.WE, Weekday.TH, Weekday.FR],
  bymonthday: 1,
  bymonth: 1,
};
