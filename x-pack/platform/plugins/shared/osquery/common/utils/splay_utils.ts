/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SPLAY_SECONDS } from '../schedule';

/**
 * Splay unit shown in the UI dropdown. Maps to the corresponding Go duration
 * suffix (`s`, `m`, `h`) accepted by osquerybeat.
 */
export type SplayUnit = 'seconds' | 'minutes' | 'hours';

/**
 * Form-state shape for the splay-time UI control: numeric value + unit.
 */
export interface SplayFormState {
  value: number;
  unit: SplayUnit;
}

const SECONDS_PER_UNIT: Record<SplayUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
};

const UNIT_TO_SUFFIX: Record<SplayUnit, string> = {
  seconds: 's',
  minutes: 'm',
  hours: 'h',
};

const SUFFIX_TO_UNIT: Record<string, SplayUnit> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
};

const SINGLE_UNIT_DURATION_REGEX = /^(\d+)\s*(s|m|h)$/i;

/**
 * Compound Go duration: at least one `<number><unit>` segment, allowing units
 * `h`, `m`, `s`, `ms`, `us`, `µs`, `ns`. Matches `time.ParseDuration` shapes
 * like `"1h30m"`, `"45m30s"`, `"1h30m45s"`. Decimal values are allowed.
 */
const GO_COMPOUND_DURATION_REGEX = /^(?:\d+(?:\.\d+)?(?:ms|us|µs|ns|s|m|h))+$/;

/**
 * Discriminated result from {@link parseSplayPermissive}.
 *
 * - `kind: 'simple'` — the duration is a single-unit value the form can render
 *   as `value` + `unit` (e.g. `"30s"`, `"5m"`, `"1h"`).
 * - `kind: 'compound'` — the duration is a multi-segment Go duration that the
 *   single-unit form input cannot represent (e.g. `"1h30m"`); callers MUST
 *   round-trip the `raw` string verbatim instead of re-serializing.
 */
export type SplayParseResult =
  | { kind: 'simple'; value: number; unit: SplayUnit }
  | { kind: 'compound'; raw: string };

/**
 * Total splay duration expressed in seconds. Useful for max validation.
 */
export const splayInSeconds = (state: SplayFormState): number =>
  state.value * SECONDS_PER_UNIT[state.unit];

/**
 * True when splay is a positive integer and the total duration is within the
 * osquerybeat-enforced max of 12 hours ({@link MAX_SPLAY_SECONDS}).
 */
export const isSplayWithinMax = (state: SplayFormState): boolean => {
  const { value, unit } = state;
  if (!Number.isInteger(value) || value <= 0) {
    return false;
  }

  if (!(unit in SECONDS_PER_UNIT)) {
    return false;
  }

  return splayInSeconds(state) <= MAX_SPLAY_SECONDS;
};

/**
 * Serialize splay form state into a Go duration string consumed by osquerybeat
 * (e.g. `"30s"`, `"5m"`, `"1h"`). Rejects non-positive values, non-integer
 * values, and durations exceeding {@link MAX_SPLAY_SECONDS}.
 */
export const serializeSplay = (state: SplayFormState): string => {
  const { value, unit } = state;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Splay value must be a positive integer, got ${value}`);
  }

  const suffix = UNIT_TO_SUFFIX[unit];
  if (!suffix) {
    throw new Error(`Invalid splay unit: ${unit}`);
  }

  if (splayInSeconds(state) > MAX_SPLAY_SECONDS) {
    throw new Error(`Splay duration must not exceed ${MAX_SPLAY_SECONDS} seconds (12 hours)`);
  }

  return `${value}${suffix}`;
};

/**
 * Permissive parser for splay strings encountered on read. Accepts both
 * single-unit ({@link parseSplay}) and compound Go durations (`"1h30m"`,
 * `"45m30s"`). Compound durations are returned verbatim as `raw` so callers
 * can round-trip them through Kibana without rewriting — beats writes splay
 * via `time.ParseDuration` and may emit compound strings.
 *
 * Throws on values that match neither shape (e.g. `"5d"`, `"100ms"` outside
 * the compound vocabulary, empty string).
 */
export const parseSplayPermissive = (duration: string): SplayParseResult => {
  if (typeof duration !== 'string') {
    throw new Error('Splay duration must be a string');
  }

  const trimmed = duration.trim();
  const singleMatch = SINGLE_UNIT_DURATION_REGEX.exec(trimmed);
  if (singleMatch) {
    const value = Number(singleMatch[1]);
    const unit = SUFFIX_TO_UNIT[singleMatch[2].toLowerCase()];
    if (Number.isInteger(value) && value > 0) {
      return { kind: 'simple', value, unit };
    }
  }

  if (GO_COMPOUND_DURATION_REGEX.test(trimmed)) {
    return { kind: 'compound', raw: trimmed };
  }

  throw new Error(
    `Invalid splay duration "${duration}": expected a Go duration (e.g. "30s", "5m", "1h", "1h30m")`
  );
};

/**
 * Parse a single-unit Go duration string (`"30s"`, `"5m"`, `"1h"`) into
 * {@link SplayFormState}. Compound durations (e.g. `"1h30m"`) are intentionally
 * rejected by this strict parser; use {@link parseSplayPermissive} when
 * round-tripping foreign formats. Beats enforces a 12-hour cap.
 */
export const parseSplay = (duration: string): SplayFormState => {
  if (typeof duration !== 'string') {
    throw new Error('Splay duration must be a string');
  }

  const trimmed = duration.trim();
  const match = SINGLE_UNIT_DURATION_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid splay duration "${duration}": expected single-unit Go duration (e.g. "30s", "5m", "1h")`
    );
  }

  const value = Number(match[1]);
  const unit = SUFFIX_TO_UNIT[match[2].toLowerCase()];

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Splay value must be a positive integer, got ${value}`);
  }

  return { value, unit };
};
