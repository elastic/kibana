/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';

import type { RRuleScheduleConfig, ScheduleType } from '../../../common';
import type { RRuleFields } from '../../../common/utils/rrule_serializer';
import { serializeRRule } from '../../../common/utils/rrule_serializer';
import { parseRRule } from '../../../common/utils/rrule_parser';
import { parseSplayPermissive, serializeSplay } from '../../../common/utils/splay_utils';
import type { ScheduleFormData, ScheduleFrequency } from '../../components/schedule_section';
import { DEFAULT_SCHEDULE_FORM_VALUES } from '../../components/schedule_section';

/**
 * API-shape projection of the schedule form state.
 *
 * Mirrors the optional schedule fields accepted by the create/update pack
 * routes (and by per-query overrides). At most one of `interval` /
 * `rrule_schedule` is populated, gated by `schedule_type`.
 */
export interface ScheduleApiFields {
  schedule_type?: ScheduleType;
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
}

const FORM_FREQUENCY_TO_RRULE: Record<ScheduleFrequency, Frequency> = {
  minutely: Frequency.MINUTELY,
  hourly: Frequency.HOURLY,
  daily: Frequency.DAILY,
  // The "Custom" UI option is a weekly recurrence with explicit BYDAY selection.
  custom: Frequency.WEEKLY,
  monthly: Frequency.MONTHLY,
  yearly: Frequency.YEARLY,
};

const RRULE_TO_FORM_FREQUENCY: Record<Frequency, ScheduleFrequency> = {
  [Frequency.MINUTELY]: 'minutely',
  [Frequency.HOURLY]: 'hourly',
  [Frequency.DAILY]: 'daily',
  [Frequency.WEEKLY]: 'custom',
  [Frequency.MONTHLY]: 'monthly',
  [Frequency.YEARLY]: 'yearly',
  // SECONDLY is not exposed in the UI; fall back to the closest supported
  // option so a foreign-saved schedule is still editable.
  [Frequency.SECONDLY]: 'minutely',
};

const buildRRuleFieldsFromForm = (form: ScheduleFormData): RRuleFields => {
  const fields: RRuleFields = { freq: FORM_FREQUENCY_TO_RRULE[form.frequency] };

  // INTERVAL=1 is the RFC default and is omitted by the serializer; we only
  // emit a value when the user picked a non-daily frequency that exposes the
  // "Repeat every" input.
  if (form.frequency !== 'daily' && form.repeat_every > 1) {
    fields.interval = form.repeat_every;
  }

  if (form.frequency === 'custom' && form.byweekday.length > 0) {
    fields.byweekday = [...form.byweekday];
  }

  if (form.frequency === 'monthly' || form.frequency === 'yearly') {
    fields.bymonthday = [form.bymonthday];
  }

  if (form.frequency === 'yearly') {
    fields.bymonth = [form.bymonth];
  }

  return fields;
};

/**
 * Serialize the flat ScheduleSection form state into the API-shape schedule
 * fields. RRULE-mode payloads collapse the structural fields (frequency,
 * byweekday, repeat_every, ...) into a single RFC 5545 string via
 * {@link serializeRRule} and a single Go duration via {@link serializeSplay}.
 */
export const serializeSchedule = (form: ScheduleFormData): ScheduleApiFields => {
  if (form.schedule_type === 'rrule') {
    const rruleString = serializeRRule(buildRRuleFieldsFromForm(form));

    const rruleConfig: RRuleScheduleConfig = {
      rrule: rruleString,
      start_date: form.start_date,
    };

    if (form.end_date_enabled && form.end_date) {
      rruleConfig.end_date = form.end_date;
    }

    if (form.splay_enabled) {
      // Compound durations (e.g. "1h30m") that beats produces via
      // `time.ParseDuration` cannot be represented in the single-unit splay
      // form. The deserializer stashes them in `splay_raw`; round-trip the
      // raw string verbatim until the user actively edits the splay field
      // (which clears `splay_raw`).
      rruleConfig.splay = form.splay_raw
        ? form.splay_raw
        : serializeSplay({
            value: form.splay_value,
            unit: form.splay_unit,
          });
    }

    return {
      schedule_type: 'rrule',
      rrule_schedule: rruleConfig,
    };
  }

  return {
    schedule_type: 'interval',
    interval: form.interval,
  };
};

/**
 * Parse the API-shape schedule fields back into the flat ScheduleSection form
 * state. Defaults are filled in from {@link DEFAULT_SCHEDULE_FORM_VALUES} so
 * partially-populated payloads (e.g. legacy packs with `interval` only) still
 * mount cleanly.
 *
 * Splay strings that fail single-unit parsing fall back to the default rather
 * than throwing — the SO already holds the canonical Go-duration string and
 * compound durations (`"1h30m"`) shouldn't break form mount.
 */
export const deserializeSchedule = (api: ScheduleApiFields): ScheduleFormData => {
  if (api.schedule_type === 'rrule' && api.rrule_schedule) {
    const fields = parseRRule(api.rrule_schedule.rrule);

    let splayValue = DEFAULT_SCHEDULE_FORM_VALUES.splay_value;
    let splayUnit = DEFAULT_SCHEDULE_FORM_VALUES.splay_unit;
    let splayEnabled = false;
    let splayRaw: string | undefined;
    if (api.rrule_schedule.splay) {
      try {
        const parsed = parseSplayPermissive(api.rrule_schedule.splay);
        if (parsed.kind === 'simple') {
          splayValue = parsed.value;
          splayUnit = parsed.unit;
          splayEnabled = true;
        } else {
          // Compound duration (e.g. "1h30m"): preserve verbatim so a re-save
          // doesn't silently drop the value (D16). Form leaves the
          // value/unit at defaults; touching either clears `splay_raw`.
          splayRaw = parsed.raw;
          splayEnabled = true;
        }
      } catch {
        splayEnabled = false;
      }
    }

    return {
      ...DEFAULT_SCHEDULE_FORM_VALUES,
      schedule_type: 'rrule',
      start_date: api.rrule_schedule.start_date,
      end_date_enabled: !!api.rrule_schedule.end_date,
      end_date: api.rrule_schedule.end_date ?? '',
      splay_enabled: splayEnabled,
      splay_value: splayValue,
      splay_unit: splayUnit,
      splay_raw: splayRaw,
      frequency: RRULE_TO_FORM_FREQUENCY[fields.freq],
      repeat_every: fields.interval ?? DEFAULT_SCHEDULE_FORM_VALUES.repeat_every,
      byweekday: fields.byweekday ?? DEFAULT_SCHEDULE_FORM_VALUES.byweekday,
      bymonthday: fields.bymonthday?.[0] ?? DEFAULT_SCHEDULE_FORM_VALUES.bymonthday,
      bymonth: fields.bymonth?.[0] ?? DEFAULT_SCHEDULE_FORM_VALUES.bymonth,
    };
  }

  return {
    ...DEFAULT_SCHEDULE_FORM_VALUES,
    schedule_type: 'interval',
    interval: api.interval ?? DEFAULT_SCHEDULE_FORM_VALUES.interval,
  };
};

/**
 * Build a fresh ScheduleSection form state suitable for `useForm` defaults.
 * Initializes `start_date` to "now" so the StartDateField has a sensible
 * pre-filled value when the user toggles into RRULE mode.
 */
export const getDefaultScheduleFormValues = (): ScheduleFormData => ({
  ...DEFAULT_SCHEDULE_FORM_VALUES,
  start_date: new Date().toISOString(),
});
