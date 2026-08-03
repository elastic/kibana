/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreservedTimeUnit } from './types';
import { toMilliseconds } from './utils';

type GetValues = (name: string) => unknown;

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
  getValues: GetValues,
  phase: Phase,
  { valuePathSuffix, unitPathSuffix, extraEnabledPathSuffix }: GetPhaseDurationMsConfig
): number | null => {
  const enabled = Boolean(getValues(`_meta.${phase}.enabled`));
  if (!enabled) return null;

  if (extraEnabledPathSuffix) {
    const extraEnabled = Boolean(getValues(`_meta.${phase}.${extraEnabledPathSuffix}`));
    if (!extraEnabled) return null;
  }

  const value = String(getValues(`_meta.${phase}.${valuePathSuffix}`) ?? '').trim();
  if (!value) return null;

  const unit = String(getValues(`_meta.${phase}.${unitPathSuffix}`) ?? 'd') as PreservedTimeUnit;
  const ms = toMilliseconds(value, unit);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
};
