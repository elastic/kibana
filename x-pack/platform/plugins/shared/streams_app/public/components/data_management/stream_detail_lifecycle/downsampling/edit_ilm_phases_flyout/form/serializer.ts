/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal } from './types';

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
    const searchableSnapshotRepository = meta.searchableSnapshot?.repository ?? '';

    const buildNextDownsample = (
      previousDownsample: unknown,
      after: string | undefined,
      fixedIntervalValue: string | undefined,
      fixedIntervalUnit: string | undefined
    ) => {
      const resolvedAfter = after ?? (previousDownsample as any)?.after ?? '0ms';
      const fixedInterval =
        formatDownsampleInterval(fixedIntervalValue, fixedIntervalUnit) ??
        (previousDownsample as any)?.fixed_interval ??
        '1d';

      return {
        ...(previousDownsample ?? {}),
        after: resolvedAfter,
        fixed_interval: fixedInterval,
      };
    };

    // HOT
    if (!meta.hot?.enabled) {
      delete next.hot;
    } else {
      const previous = next.hot ?? ({} as any);
      next.hot = {
        ...previous,
        name: 'hot',
        rollover: meta.hot.rollover ?? previous.rollover ?? {},
      };
      const hot = next.hot as any;

      if (meta.hot.readonlyEnabled) {
        hot.readonly = true;
      } else {
        delete hot.readonly;
      }

      if (meta.hot.downsampleEnabled) {
        const after = (previous as any).min_age ?? '0ms';
        hot.downsample = buildNextDownsample(
          previous.downsample,
          after,
          meta.hot.downsample?.fixedIntervalValue,
          meta.hot.downsample?.fixedIntervalUnit
        );
      } else {
        delete hot.downsample;
      }
    }

    // WARM
    if (!meta.warm?.enabled) {
      delete next.warm;
    } else {
      const previous = next.warm ?? ({} as any);
      const minAge = formatDuration(meta.warm.minAgeValue, meta.warm.minAgeUnit);
      next.warm = {
        ...previous,
        name: 'warm',
        min_age: minAge,
      };
      if (!minAge) delete (next.warm as any).min_age;

      if (meta.warm.readonlyEnabled) {
        (next.warm as any).readonly = true;
      } else {
        delete (next.warm as any).readonly;
      }

      if (meta.warm.downsampleEnabled) {
        const after = minAge ?? (previous as any).min_age ?? '0ms';
        (next.warm as any).downsample = buildNextDownsample(
          previous.downsample,
          after,
          meta.warm.downsample?.fixedIntervalValue,
          meta.warm.downsample?.fixedIntervalUnit
        );
      } else {
        delete (next.warm as any).downsample;
      }
    }

    // COLD
    if (!meta.cold?.enabled) {
      delete next.cold;
    } else {
      const previous = next.cold ?? ({} as any);
      const minAge = formatDuration(meta.cold.minAgeValue, meta.cold.minAgeUnit);
      next.cold = {
        ...previous,
        name: 'cold',
        min_age: minAge,
      };
      if (!minAge) delete (next.cold as any).min_age;

      if (meta.cold.readonlyEnabled) {
        (next.cold as any).readonly = true;
      } else {
        delete (next.cold as any).readonly;
      }

      if (meta.cold.downsampleEnabled) {
        const after = minAge ?? (previous as any).min_age ?? '0ms';
        (next.cold as any).downsample = buildNextDownsample(
          previous.downsample,
          after,
          meta.cold.downsample?.fixedIntervalValue,
          meta.cold.downsample?.fixedIntervalUnit
        );
      } else {
        delete (next.cold as any).downsample;
      }

      if (meta.cold.searchableSnapshotEnabled) {
        (next.cold as any).searchable_snapshot = searchableSnapshotRepository;
      } else {
        delete (next.cold as any).searchable_snapshot;
      }
    }

    // FROZEN
    if (!meta.frozen?.enabled) {
      delete next.frozen;
    } else {
      const previous = next.frozen ?? ({} as any);
      const minAge = formatDuration(meta.frozen.minAgeValue, meta.frozen.minAgeUnit);
      next.frozen = {
        ...previous,
        name: 'frozen',
        min_age: minAge,
      };
      if (!minAge) delete (next.frozen as any).min_age;

      // Frozen phase always requires searchable snapshots
      (next.frozen as any).searchable_snapshot = searchableSnapshotRepository;
    }

    // DELETE
    if (!meta.delete?.enabled) {
      delete next.delete;
    } else {
      const previous = (next.delete ?? {}) as any;
      next.delete = {
        ...previous,
        name: 'delete',
        min_age: formatDuration(meta.delete.minAgeValue, meta.delete.minAgeUnit) ?? '',
        delete_searchable_snapshot: Boolean(meta.delete.deleteSearchableSnapshotEnabled),
      } as any;
    }

    return next;
  };
};
