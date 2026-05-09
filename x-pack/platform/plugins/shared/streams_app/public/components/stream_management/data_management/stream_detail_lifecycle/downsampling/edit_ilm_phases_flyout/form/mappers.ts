/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type {
  IlmPolicyDeletePhase,
  IlmPolicyHotPhase,
  IlmPolicyPhase,
  IlmPolicyPhases,
} from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal, PreservedTimeUnit } from './types';
import { parseInterval } from './utils';

type AnyRecord = Record<string, unknown>;
type DownsampleOutput = { after: string; fixed_interval: string } & AnyRecord;

const formatDuration = (
  value: string | undefined,
  unit: string | undefined
): string | undefined => {
  if (!value || value.trim() === '') return;
  if (!unit) return;
  return `${Number(value)}${unit}`;
};

const formatDownsampleInterval = (
  value: string | undefined,
  unit: string | undefined
): string | undefined => {
  if (!value || value.trim() === '') return;
  if (!unit) return;
  return `${value}${unit}`;
};

/**
 * Maps the saved ILM phases shape into RHF `defaultValues` (internal form model).
 */
export const mapIlmPolicyPhasesToFormValues = (
  phases: IlmPolicyPhases
): IlmPhasesFlyoutFormInternal => {
  const withMillis = (duration: string | undefined) => {
    const parsed = parseInterval(duration);
    const minAgeValue = parsed?.value ?? '';
    const minAgeUnit = (parsed?.unit ?? 'd') as PreservedTimeUnit;
    return {
      minAgeValue,
      minAgeUnit,
    };
  };

  const withDownsampleDefaults = (fixedInterval: string | undefined) => {
    const parsed = parseInterval(fixedInterval);
    return {
      fixedIntervalValue: parsed?.value ?? '1',
      fixedIntervalUnit: (parsed?.unit ?? 'd') as PreservedTimeUnit,
    };
  };

  const searchableSnapshotRepository =
    phases.cold?.searchable_snapshot ?? phases.frozen?.searchable_snapshot ?? '';

  return {
    _meta: {
      hot: {
        enabled: Boolean(phases.hot),
        sizeInBytes: phases.hot?.size_in_bytes ?? 0,
        rollover: phases.hot?.rollover ?? {},
        readonlyEnabled: Boolean(phases.hot?.readonly),
        downsampleEnabled: Boolean(phases.hot?.downsample),
        downsample: {
          ...withDownsampleDefaults(phases.hot?.downsample?.fixed_interval),
        },
      },
      warm: {
        enabled: Boolean(phases.warm),
        sizeInBytes: phases.warm?.size_in_bytes ?? 0,
        readonlyEnabled: Boolean(phases.warm?.readonly),
        downsampleEnabled: Boolean(phases.warm?.downsample),
        downsample: {
          ...withDownsampleDefaults(phases.warm?.downsample?.fixed_interval),
        },
        ...withMillis(phases.warm?.min_age ?? phases.warm?.downsample?.after),
      },
      cold: {
        enabled: Boolean(phases.cold),
        sizeInBytes: phases.cold?.size_in_bytes ?? 0,
        readonlyEnabled: Boolean(phases.cold?.readonly),
        downsampleEnabled: Boolean(phases.cold?.downsample),
        downsample: {
          ...withDownsampleDefaults(phases.cold?.downsample?.fixed_interval),
        },
        searchableSnapshotEnabled: Boolean(phases.cold?.searchable_snapshot),
        ...withMillis(phases.cold?.min_age ?? phases.cold?.downsample?.after),
      },
      frozen: {
        enabled: Boolean(phases.frozen),
        ...withMillis(phases.frozen?.min_age),
      },
      delete: {
        enabled: Boolean(phases.delete),
        deleteSearchableSnapshotEnabled: phases.delete
          ? phases.delete?.delete_searchable_snapshot == null
            ? true
            : Boolean(phases.delete?.delete_searchable_snapshot)
          : true,
        ...withMillis(phases.delete?.min_age),
      },
      searchableSnapshot: {
        repository: searchableSnapshotRepository,
      },
    },
  };
};

/**
 * Maps RHF form values into the saved ILM phases shape, preserving unknown fields by
 * cloning and overlaying onto an initial baseline.
 */
export const createMapFormValuesToIlmPolicyPhases = (baselinePhases: IlmPolicyPhases = {}) => {
  return (data: IlmPhasesFlyoutFormInternal): IlmPolicyPhases => {
    const next: IlmPolicyPhases = cloneDeep(baselinePhases);
    const meta = data._meta;

    if (!meta) {
      return next;
    }

    const searchableSnapshotRepository = meta.searchableSnapshot?.repository ?? '';

    const buildNextDownsample = (
      previousDownsample: unknown,
      after: string | undefined,
      fixedIntervalValue: string | undefined,
      fixedIntervalUnit: string | undefined
    ): DownsampleOutput => {
      const previous =
        previousDownsample && typeof previousDownsample === 'object'
          ? (previousDownsample as AnyRecord)
          : {};

      const previousAfter = typeof previous.after === 'string' ? previous.after : undefined;
      const previousFixedInterval =
        typeof previous.fixed_interval === 'string' ? previous.fixed_interval : undefined;

      const resolvedAfter = after ?? previousAfter ?? '0ms';
      const fixedInterval =
        formatDownsampleInterval(fixedIntervalValue, fixedIntervalUnit) ??
        previousFixedInterval ??
        // Should not happen when form is valid, but keep output shape stable for live previews.
        '1d';

      return {
        ...previous,
        after: resolvedAfter,
        fixed_interval: fixedInterval,
      };
    };

    const getSizeInBytes = (previous: { size_in_bytes?: unknown } | undefined): number => {
      const value = previous?.size_in_bytes;
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    };

    // HOT
    if (!meta.hot?.enabled) {
      delete next.hot;
    } else {
      const previous = (next.hot ?? {}) as Partial<IlmPolicyHotPhase>;
      const hot: IlmPolicyHotPhase = {
        ...previous,
        name: 'hot',
        size_in_bytes: getSizeInBytes(previous),
        rollover: meta.hot.rollover ?? previous.rollover ?? {},
        ...(meta.hot.readonlyEnabled ? { readonly: true } : {}),
        ...(meta.hot.downsampleEnabled
          ? {
              downsample: buildNextDownsample(
                previous.downsample,
                // Hot doesn't have min_age; use 0ms to match current behavior.
                previous.min_age ?? '0ms',
                meta.hot.downsample?.fixedIntervalValue,
                meta.hot.downsample?.fixedIntervalUnit
              ),
            }
          : {}),
      };

      // Strip any previously-set fields that are now disabled
      if (!meta.hot.readonlyEnabled) delete hot.readonly;
      if (!meta.hot.downsampleEnabled) delete hot.downsample;

      next.hot = hot;
    }

    // WARM
    if (!meta.warm?.enabled) {
      delete next.warm;
    } else {
      const minAge = formatDuration(meta.warm.minAgeValue, meta.warm.minAgeUnit);
      const previous = (next.warm ?? {}) as Partial<IlmPolicyPhase>;
      const warm: IlmPolicyPhase = {
        ...previous,
        name: 'warm',
        size_in_bytes: getSizeInBytes(previous),
        ...(minAge ? { min_age: minAge } : {}),
        ...(meta.warm.readonlyEnabled ? { readonly: true } : {}),
        ...(meta.warm.downsampleEnabled
          ? {
              downsample: buildNextDownsample(
                previous.downsample,
                minAge ?? previous.min_age?.toString() ?? '0ms',
                meta.warm.downsample?.fixedIntervalValue,
                meta.warm.downsample?.fixedIntervalUnit
              ),
            }
          : {}),
      };

      if (!minAge) delete warm.min_age;
      if (!meta.warm.readonlyEnabled) delete warm.readonly;
      if (!meta.warm.downsampleEnabled) delete warm.downsample;

      next.warm = warm;
    }

    // COLD
    if (!meta.cold?.enabled) {
      delete next.cold;
    } else {
      const minAge = formatDuration(meta.cold.minAgeValue, meta.cold.minAgeUnit);
      const previous = (next.cold ?? {}) as Partial<IlmPolicyPhase>;
      const cold: IlmPolicyPhase = {
        ...previous,
        name: 'cold',
        size_in_bytes: getSizeInBytes(previous),
        ...(minAge ? { min_age: minAge } : {}),
        ...(meta.cold.readonlyEnabled ? { readonly: true } : {}),
        ...(meta.cold.downsampleEnabled
          ? {
              downsample: buildNextDownsample(
                previous.downsample,
                minAge ?? previous.min_age?.toString() ?? '0ms',
                meta.cold.downsample?.fixedIntervalValue,
                meta.cold.downsample?.fixedIntervalUnit
              ),
            }
          : {}),
        ...(meta.cold.searchableSnapshotEnabled
          ? { searchable_snapshot: searchableSnapshotRepository }
          : {}),
      };

      if (!minAge) delete cold.min_age;
      if (!meta.cold.readonlyEnabled) delete cold.readonly;
      if (!meta.cold.downsampleEnabled) delete cold.downsample;
      if (!meta.cold.searchableSnapshotEnabled) delete cold.searchable_snapshot;

      next.cold = cold;
    }

    // FROZEN
    if (!meta.frozen?.enabled) {
      delete next.frozen;
    } else {
      const minAge = formatDuration(meta.frozen.minAgeValue, meta.frozen.minAgeUnit);
      const previous = (next.frozen ?? {}) as Partial<IlmPolicyPhase>;
      const frozen: IlmPolicyPhase = {
        ...previous,
        name: 'frozen',
        size_in_bytes: getSizeInBytes(previous),
        ...(minAge ? { min_age: minAge } : {}),
        // Frozen phase always requires searchable snapshots.
        searchable_snapshot: searchableSnapshotRepository,
      };
      if (!minAge) delete frozen.min_age;

      next.frozen = frozen;
    }

    // DELETE
    if (!meta.delete?.enabled) {
      delete next.delete;
    } else {
      const previous = (next.delete ?? {}) as Partial<IlmPolicyDeletePhase>;
      const deleteSearchableSnapshotEnabled = Boolean(meta.delete.deleteSearchableSnapshotEnabled);
      const del: IlmPolicyDeletePhase = {
        ...previous,
        name: 'delete',
        min_age: formatDuration(meta.delete.minAgeValue, meta.delete.minAgeUnit) ?? '',
      };

      if (!deleteSearchableSnapshotEnabled) {
        del.delete_searchable_snapshot = false;
      } else if (previous.delete_searchable_snapshot === true) {
        del.delete_searchable_snapshot = true;
      } else if (previous.delete_searchable_snapshot === false) {
        // Preserve explicit `false` -> `true` transitions (user enabled the default behavior).
        del.delete_searchable_snapshot = true;
      } else {
        // Preserve omission when the baseline omits the field and the UI is in the default "enabled" state.
        delete del.delete_searchable_snapshot;
      }

      next.delete = del;
    }

    return next;
  };
};
