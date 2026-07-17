/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, xor } from 'lodash';
import { useForm as useHookForm } from 'react-hook-form';
import type { Draft } from 'immer';
import { produce } from 'immer';
import { useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { DEFAULT_PLATFORM, QUERY_TIMEOUT } from '../../../common/constants';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common/schedule';
import type { Shard } from '../../../common/utils/converters';
import type { ScheduleFormData } from '../../components/schedule_section/types';
import { deserializeSchedule, serializeSchedule } from '../form/schedule_serializer';

export interface UsePackQueryFormProps {
  uniqueQueryIds: string[];
  defaultValue?: PackSOQueryFormData | undefined;
  // Pack-level schedule; when set, the flyout treats it as the inherited
  // default and locks the type selector to the pack's mode.
  packSchedule?: {
    schedule_type?: ScheduleType;
    interval?: number;
    rrule_schedule?: RRuleScheduleConfig;
  };
}

export interface PackSOQueryFormData {
  id: string;
  query: string;
  interval: string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string | undefined;
  version?: string | undefined;
  ecs_mapping?: ECSMapping;
  shards: Shard;
  /** Per-query schedule type override. Mutually exclusive with sibling fields per type. */
  schedule_type?: ScheduleType;
  /** Per-query RRULE schedule override. Only present when `schedule_type === 'rrule'`. */
  rrule_schedule?: RRuleScheduleConfig;
}

export type PackQuerySOECSMapping = Array<{ field: string; value: string }>;

export interface PackQueryFormData {
  id: string;
  // Stored id captured at deserialize time, kept stable across a rename so
  // edit-save can preserve the original schedule_id.
  originalId?: string;
  description?: string;
  query: string;
  interval: number;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string | undefined;
  version?: string[] | undefined;
  ecs_mapping: ECSMapping;
  schedule_id?: string;
  // When false, inherits the pack schedule and emits no per-query schedule fields.
  override_pack_schedule?: boolean;
  schedule?: ScheduleFormData;
  schedule_type?: ScheduleType;
  rrule_schedule?: RRuleScheduleConfig;
}

const isSameScheduleMode = (
  packScheduleType: ScheduleType | undefined,
  queryScheduleType: ScheduleType | undefined
): boolean => packScheduleType === undefined || packScheduleType === queryScheduleType;

const stripInheritedScheduleFields = (
  base: PackSOQueryFormData,
  packScheduleType: ScheduleType | undefined
): PackSOQueryFormData => {
  if (packScheduleType === 'rrule') {
    const { interval: _interval, timeout: _timeout, ...stripped } = base;

    return stripped as PackSOQueryFormData;
  }

  if (packScheduleType === 'interval') {
    const { interval: _interval, ...stripped } = base;

    return stripped as PackSOQueryFormData;
  }

  return base;
};

/**
 * Deserializes the query's own override, or falls back to the inherited
 * pack schedule. Reused for both `defaultValues.schedule` and
 * `originalStartDate` so they can't diverge.
 */
const deserializeQuerySchedule = (
  payload: PackSOQueryFormData | undefined,
  packSchedule?: UsePackQueryFormProps['packSchedule']
): ScheduleFormData => {
  const hasOverride = payload?.schedule_type !== undefined;

  return hasOverride
    ? deserializeSchedule({
        schedule_type: payload?.schedule_type,
        interval: payload?.interval ? parseInt(payload.interval, 10) : undefined,
        rrule_schedule: payload?.rrule_schedule,
      })
    : deserializeSchedule({
        schedule_type: packSchedule?.schedule_type,
        interval: packSchedule?.interval,
        rrule_schedule: packSchedule?.rrule_schedule,
      });
};

const deserializer = (
  payload: PackSOQueryFormData,
  deserializedSchedule: ScheduleFormData
): PackQueryFormData => {
  const hasOverride = payload.schedule_type !== undefined;

  return {
    id: payload.id,
    query: payload.query,
    interval: payload.interval ? parseInt(payload.interval, 10) : 3600,
    timeout: payload.timeout || QUERY_TIMEOUT.DEFAULT,
    snapshot: payload.snapshot,
    removed: payload.removed,
    platform: payload.platform || DEFAULT_PLATFORM,
    version: payload.version ? [payload.version] : [],
    ecs_mapping: payload.ecs_mapping ?? {},
    override_pack_schedule: hasOverride,
    schedule: deserializedSchedule,
  };
};

const serializer = (
  payload: PackQueryFormData,
  packSchedule?: UsePackQueryFormProps['packSchedule']
): PackSOQueryFormData => {
  // The schedule fields live outside the immer-produced shape because the
  // PackSOQueryFormData wire type tightens `schedule_type` / `rrule_schedule`
  // and drops `override_pack_schedule` / `schedule`.
  const { override_pack_schedule: overridePackSchedule, schedule, ...rest } = payload;

  const base = produce(
    rest as unknown as PackSOQueryFormData,
    (draft: Draft<PackSOQueryFormData>) => {
      if (isArray(draft.platform)) {
        if (draft.platform.length) {
          draft.platform.join(',');
        } else {
          delete draft.platform;
        }
      }

      if (isArray(draft.version)) {
        if (!draft.version.length) {
          delete draft.version;
        } else {
          draft.version = draft.version[0];
        }
      }

      if (draft.interval) {
        draft.interval = draft.interval + '';
      }

      if (isEmpty(draft.ecs_mapping)) {
        delete draft.ecs_mapping;
      }

      return draft;
    }
  );

  if (!overridePackSchedule || !schedule) {
    return stripInheritedScheduleFields(base, packSchedule?.schedule_type);
  }

  const serialized = serializeSchedule(schedule);
  if (!isSameScheduleMode(packSchedule?.schedule_type, serialized.schedule_type)) {
    return stripInheritedScheduleFields(base, packSchedule?.schedule_type);
  }

  if (serialized.schedule_type === 'rrule' && serialized.rrule_schedule) {
    const { interval: _interval, timeout: _timeout, ...withoutLegacy } = base;

    return {
      ...(withoutLegacy as PackSOQueryFormData),
      schedule_type: 'rrule',
      rrule_schedule: serialized.rrule_schedule,
    };
  }

  if (serialized.schedule_type === 'interval' && serialized.interval !== undefined) {
    return {
      ...base,
      schedule_type: 'interval',
      interval: serialized.interval + '',
    };
  }

  return base;
};

export const usePackQueryForm = ({
  uniqueQueryIds,
  defaultValue,
  packSchedule,
}: UsePackQueryFormProps) => {
  const idSet = useMemo<Set<string>>(
    () => new Set<string>(xor(uniqueQueryIds, defaultValue?.id ? [defaultValue.id] : [])),
    [uniqueQueryIds, defaultValue]
  );

  const deserializedSchedule = useMemo(
    () => deserializeQuerySchedule(defaultValue, packSchedule),
    [defaultValue, packSchedule]
  );

  return {
    serializer: (payload: PackQueryFormData) => serializer(payload, packSchedule),
    idSet,
    deserializedSchedule,
    ...useHookForm<PackQueryFormData>({
      defaultValues: defaultValue
        ? deserializer(defaultValue, deserializedSchedule)
        : {
            id: '',
            query: '',
            interval: 3600,
            snapshot: true,
            removed: false,
            platform: DEFAULT_PLATFORM,
            override_pack_schedule: false,
            schedule: deserializedSchedule,
          },
    }),
  };
};
