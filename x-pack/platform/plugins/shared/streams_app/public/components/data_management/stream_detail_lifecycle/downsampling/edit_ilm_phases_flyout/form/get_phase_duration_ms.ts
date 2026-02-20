/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreservedTimeUnit } from './types';
import { toMilliseconds } from './utils';

interface FormWithFields {
  getFields: () => Record<string, { value: unknown } | undefined>;
}

export interface GetPhaseDurationMsConfig {
  /**
   * Suffix under `_meta.<phase>.` containing the numeric value.
   * Examples:
   * - `minAgeValue`
   * - `downsample.fixedIntervalValue`
   */
  valuePathSuffix: string;
  /**
   * Suffix under `_meta.<phase>.` containing the unit.
   * Examples:
   * - `minAgeUnit`
   * - `downsample.fixedIntervalUnit`
   */
  unitPathSuffix: string;
  /**
   * Optional suffix under `_meta.<phase>.` that must be `true` for the duration to be considered.
   * Example:
   * - `downsampleEnabled`
   */
  extraEnabledPathSuffix?: string;
}

export const getPhaseDurationMs = <Phase extends string>(
  form: FormWithFields,
  phase: Phase,
  { valuePathSuffix, unitPathSuffix, extraEnabledPathSuffix }: GetPhaseDurationMsConfig
): number | null => {
  const fields = form.getFields();

  const enabled = Boolean(fields[`_meta.${phase}.enabled`]?.value);
  if (!enabled) return null;

  if (extraEnabledPathSuffix) {
    const extraEnabled = Boolean(fields[`_meta.${phase}.${extraEnabledPathSuffix}`]?.value);
    if (!extraEnabled) return null;
  }

  const value = String(fields[`_meta.${phase}.${valuePathSuffix}`]?.value ?? '').trim();
  if (!value) return null;

  const unit = String(
    fields[`_meta.${phase}.${unitPathSuffix}`]?.value ?? 'd'
  ) as PreservedTimeUnit;
  const ms = toMilliseconds(value, unit);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
};
