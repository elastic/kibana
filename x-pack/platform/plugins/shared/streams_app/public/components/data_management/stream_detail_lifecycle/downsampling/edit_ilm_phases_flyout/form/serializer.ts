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
import type { IlmPhasesFlyoutFormInternal } from './types';

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

export const createIlmPhasesFlyoutSerializer = (initialPhases: IlmPolicyPhases = {}) => {
  return (data: IlmPhasesFlyoutFormInternal): IlmPolicyPhases => {
    const next: IlmPolicyPhases = cloneDeep(initialPhases);
    const meta = data._meta;

    // During initial mount, hook-form may call the serializer with partial data.
    // In that case, keep the initial phases unchanged.
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
      const del: IlmPolicyDeletePhase = {
        ...previous,
        name: 'delete',
        min_age: formatDuration(meta.delete.minAgeValue, meta.delete.minAgeUnit) ?? '',
        delete_searchable_snapshot: Boolean(meta.delete.deleteSearchableSnapshotEnabled),
      };

      next.delete = del;
    }

    return next;
  };
};
