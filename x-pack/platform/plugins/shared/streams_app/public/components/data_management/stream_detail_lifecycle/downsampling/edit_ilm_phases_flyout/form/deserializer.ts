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
};
