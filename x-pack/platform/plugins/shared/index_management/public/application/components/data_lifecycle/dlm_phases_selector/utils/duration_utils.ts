/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extraTimeUnits, timeUnits } from '../../../../constants/time_units';
import type {
  DlmPhaseDuration,
  DlmPhasesSelectorProps,
  DlmPhasesSelectorValue,
  SerializedDlmPhases,
} from '../types';
import { dlmPhasesSelectorStrings as strings } from '../strings';

export interface DurationValidation {
  frozenError?: string;
  deleteError?: string;
  isValid: boolean;
}

const DEFAULT_VALUE: DlmPhasesSelectorValue = {
  frozen: { enabled: false, value: '30', unit: 'd' },
  delete: { enabled: false, value: '60', unit: 'd' },
};

const UNIT_TO_SECONDS: Record<string, number> = {
  d: 24 * 60 * 60,
  h: 60 * 60,
  m: 60,
  s: 1,
  ms: 1 / 1000,
  micros: 1 / 1_000_000,
  nanos: 1 / 1_000_000_000,
};

export const isPositiveInteger = (value: string): boolean => {
  return /^\d+$/.test(value) && Number(value) > 0;
};

const getDurationInSeconds = ({ value, unit }: DlmPhaseDuration): number | undefined => {
  const unitMultiplier = UNIT_TO_SECONDS[unit];

  if (unitMultiplier === undefined) {
    return undefined;
  }

  return Number(value) * unitMultiplier;
};

export const getDurationUnitSelectOptions = (currentUnit: string) => {
  if (timeUnits.some((unit) => unit.value === currentUnit)) {
    return timeUnits;
  }

  const extraUnit = extraTimeUnits.find((unit) => unit.value === currentUnit);
  if (extraUnit) {
    return [...timeUnits, extraUnit];
  }

  return [...timeUnits, { value: currentUnit, text: currentUnit }];
};

export const getDurationLabel = ({ value, unit }: DlmPhaseDuration): string => `${value}${unit}`;

export const serializeDlmPhases = ({
  frozen,
  delete: deletePhase,
}: DlmPhasesSelectorValue): SerializedDlmPhases => ({
  frozen_after: frozen.enabled ? getDurationLabel(frozen) : undefined,
  data_retention: deletePhase.enabled ? getDurationLabel(deletePhase) : undefined,
});

export const validateDurations = ({
  frozen,
  delete: deletePhase,
}: DlmPhasesSelectorValue): DurationValidation => {
  let frozenError: string | undefined;
  let deleteError: string | undefined;

  const isFrozenDurationValid = !frozen.enabled || isPositiveInteger(frozen.value);
  const isDeleteDurationValid = !deletePhase.enabled || isPositiveInteger(deletePhase.value);

  if (!isFrozenDurationValid) {
    frozenError = strings.positiveIntegerRequiredError;
  }

  if (!isDeleteDurationValid) {
    deleteError = strings.positiveIntegerRequiredError;
  }

  if (frozen.enabled && deletePhase.enabled && isFrozenDurationValid && isDeleteDurationValid) {
    const frozenDuration = getDurationInSeconds(frozen);
    const deleteDuration = getDurationInSeconds(deletePhase);

    if (
      frozenDuration !== undefined &&
      deleteDuration !== undefined &&
      frozenDuration >= deleteDuration
    ) {
      frozenError = strings.frozenMustOccurBeforeDeleteError(getDurationLabel(deletePhase));
      deleteError = strings.deleteMustOccurAfterFrozenError(getDurationLabel(frozen));
    }
  }

  return {
    frozenError,
    deleteError,
    isValid: !frozenError && !deleteError,
  };
};

export const mergeDefaultValue = (
  defaultValue?: DlmPhasesSelectorProps['defaultValue']
): DlmPhasesSelectorValue => ({
  frozen: { ...DEFAULT_VALUE.frozen, ...defaultValue?.frozen },
  delete: { ...DEFAULT_VALUE.delete, ...defaultValue?.delete },
});
