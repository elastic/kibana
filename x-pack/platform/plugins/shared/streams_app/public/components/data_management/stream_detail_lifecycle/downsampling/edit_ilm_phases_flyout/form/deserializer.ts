/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal, PreservedTimeUnit } from './types';
import { parseInterval, toMilliseconds } from './utils';

export const createIlmPhasesFlyoutDeserializer = () => {
  return (phases: IlmPolicyPhases): IlmPhasesFlyoutFormInternal => {
    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

    const getPhaseActions = (phase: unknown): Record<string, unknown> => {
      const phaseRecord = asRecord(phase);
      return asRecord(phaseRecord.actions);
    };

    const getActionValue = (phase: unknown, actionName: string): unknown =>
      getPhaseActions(phase)[actionName];

    const withMillis = (duration: string | undefined) => {
      const parsed = parseInterval(duration);
      const minAgeValue = parsed?.value ?? '';
      const minAgeUnit = (parsed?.unit ?? 'd') as PreservedTimeUnit;
      return {
        minAgeValue,
        minAgeUnit,
        minAgeToMilliSeconds:
          minAgeValue.trim() === '' ? -1 : toMilliseconds(minAgeValue, minAgeUnit),
      };
    };

    const withDownsampleDefaults = (fixedInterval: string | undefined) => {
      const parsed = parseInterval(fixedInterval);
      return {
        fixedIntervalValue: parsed?.value ?? '1',
        fixedIntervalUnit: (parsed?.unit ?? 'd') as PreservedTimeUnit,
      };
    };

    const hotRolloverFromActions = getActionValue(phases.hot, 'rollover');
    const hotDownsampleFromActions = getActionValue(phases.hot, 'downsample');
    const warmDownsampleFromActions = getActionValue(phases.warm, 'downsample');
    const coldDownsampleFromActions = getActionValue(phases.cold, 'downsample');
    const coldSearchableSnapshotFromActions = getActionValue(phases.cold, 'searchable_snapshot');
    const frozenSearchableSnapshotFromActions = getActionValue(
      phases.frozen,
      'searchable_snapshot'
    );
    const deleteAction = getActionValue(phases.delete, 'delete');
    const hasHotReadonlyAction = getActionValue(phases.hot, 'readonly') !== undefined;
    const hasWarmReadonlyAction = getActionValue(phases.warm, 'readonly') !== undefined;
    const hasColdReadonlyAction = getActionValue(phases.cold, 'readonly') !== undefined;
    const deleteSearchableSnapshotFromActions = asRecord(deleteAction)
      .delete_searchable_snapshot as boolean | undefined;

    const coldSearchableSnapshotRepository =
      phases.cold?.searchable_snapshot ??
      (asRecord(coldSearchableSnapshotFromActions).snapshot_repository as string | undefined);
    const frozenSearchableSnapshotRepository =
      phases.frozen?.searchable_snapshot ??
      (asRecord(frozenSearchableSnapshotFromActions).snapshot_repository as string | undefined);

    const searchableSnapshotRepository =
      coldSearchableSnapshotRepository ?? frozenSearchableSnapshotRepository ?? '';

    return {
      _meta: {
        hot: {
          enabled: Boolean(phases.hot),
          sizeInBytes: phases.hot?.size_in_bytes ?? 0,
          rollover:
            phases.hot?.rollover ??
            (asRecord(
              hotRolloverFromActions
            ) as IlmPhasesFlyoutFormInternal['_meta']['hot']['rollover']) ??
            {},
          readonlyEnabled: Boolean(phases.hot?.readonly) || hasHotReadonlyAction,
          downsampleEnabled: Boolean(phases.hot?.downsample || hotDownsampleFromActions),
          downsample: {
            ...withDownsampleDefaults(
              phases.hot?.downsample?.fixed_interval ??
                (asRecord(hotDownsampleFromActions).fixed_interval as string | undefined)
            ),
          },
        },
        warm: {
          enabled: Boolean(phases.warm),
          sizeInBytes: phases.warm?.size_in_bytes ?? 0,
          readonlyEnabled: Boolean(phases.warm?.readonly) || hasWarmReadonlyAction,
          downsampleEnabled: Boolean(phases.warm?.downsample || warmDownsampleFromActions),
          downsample: {
            ...withDownsampleDefaults(
              phases.warm?.downsample?.fixed_interval ??
                (asRecord(warmDownsampleFromActions).fixed_interval as string | undefined)
            ),
          },
          ...withMillis(
            phases.warm?.min_age ??
              phases.warm?.downsample?.after ??
              (asRecord(warmDownsampleFromActions).after as string | undefined)
          ),
        },
        cold: {
          enabled: Boolean(phases.cold),
          sizeInBytes: phases.cold?.size_in_bytes ?? 0,
          readonlyEnabled: Boolean(phases.cold?.readonly) || hasColdReadonlyAction,
          downsampleEnabled: Boolean(phases.cold?.downsample || coldDownsampleFromActions),
          downsample: {
            ...withDownsampleDefaults(
              phases.cold?.downsample?.fixed_interval ??
                (asRecord(coldDownsampleFromActions).fixed_interval as string | undefined)
            ),
          },
          searchableSnapshotEnabled: Boolean(coldSearchableSnapshotRepository),
          ...withMillis(
            phases.cold?.min_age ??
              phases.cold?.downsample?.after ??
              (asRecord(coldDownsampleFromActions).after as string | undefined)
          ),
        },
        frozen: {
          enabled: Boolean(phases.frozen),
          ...withMillis(phases.frozen?.min_age),
        },
        delete: {
          enabled: Boolean(phases.delete),
          deleteSearchableSnapshotEnabled: phases.delete
            ? phases.delete?.delete_searchable_snapshot == null
              ? deleteSearchableSnapshotFromActions == null
                ? true
                : Boolean(deleteSearchableSnapshotFromActions)
              : Boolean(phases.delete?.delete_searchable_snapshot)
            : deleteSearchableSnapshotFromActions == null
            ? true
            : Boolean(deleteSearchableSnapshotFromActions),
          ...withMillis(phases.delete?.min_age),
        },
        searchableSnapshot: {
          repository: searchableSnapshotRepository,
        },
      },
    };
  };
};
