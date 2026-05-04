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
 * Total splay duration expressed in seconds. Useful for max validation.
 */
export const splayInSeconds = (state: SplayFormState): number =>
  state.value * SECONDS_PER_UNIT[state.unit];

/**
 * True when splay is a positive integer and the total duration is within the
 * osquerybeat-enforced max of 1 hour ({@link MAX_SPLAY_SECONDS}).
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
    throw new Error(`Splay duration must not exceed ${MAX_SPLAY_SECONDS} seconds (1 hour)`);
  }

  return `${value}${suffix}`;
};

/**
 * Parse a single-unit Go duration string (`"30s"`, `"5m"`, `"1h"`) into
 * {@link SplayFormState}. Compound durations (e.g. `"1h30m"`) are intentionally
 * rejected: the splay UI is single-unit, and beats enforces a 1-hour cap. Use
 * the SO field directly when round-tripping foreign formats.
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
