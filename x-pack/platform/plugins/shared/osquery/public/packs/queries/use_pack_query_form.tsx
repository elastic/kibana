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
import { QUERY_TIMEOUT } from '../../../common/constants';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common';
import type { Shard } from '../../../common/utils/converters';
import type { ScheduleFormData } from '../../components/schedule_section';
import {
  deserializeSchedule,
  getDefaultScheduleFormValues,
  serializeSchedule,
} from '../form/schedule_serializer';

export interface UsePackQueryFormProps {
  uniqueQueryIds: string[];
  defaultValue?: PackSOQueryFormData | undefined;
  /**
   * Pack-level schedule used to seed per-query schedule form state. When the
   * query has no override (`schedule_type` absent), the flyout pre-fills the
   * ScheduleSection with the pack's schedule and the "Override pack schedule"
   * toggle defaults to OFF — flipping it ON lets the user diverge.
   */
  packDefaultSchedule?: ScheduleFormData;
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
  /** Per-query schedule type override. Absent => inherits pack schedule. */
  schedule_type?: ScheduleType;
  /** Per-query RRULE override (set when `schedule_type === 'rrule'`). */
  rrule_schedule?: RRuleScheduleConfig;
}

export type PackQuerySOECSMapping = Array<{ field: string; value: string }>;

/**
 * Pack query form state. Schedule fields are flat (so each ScheduleSection
 * sub-component can bind via `useController({ name })`) and only contribute to
 * the API payload when {@link override_pack_schedule} is `true`.
 *
 * Note: this type doubles as the value type of the parent pack form's
 * `queries` field array (see `public/packs/form/queries_field.tsx`). The field
 * array stores values that round-trip through `convertPackQueriesToSO`, which
 * means the SO-shape `rrule_schedule` field also rides along — exposed here as
 * an optional passthrough so the lodash `pick` calls type-check.
 */
export interface PackQueryFormData extends ScheduleFormData {
  id: string;
  description?: string;
  query: string;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string | undefined;
  version?: string[] | undefined;
  ecs_mapping: ECSMapping;
  /**
   * UI-only toggle: when `true` the per-query schedule fields are emitted to
   * the API and the server's fan-out treats this query as overriding the
   * pack-level schedule. When `false` no schedule fields are emitted and the
   * query inherits the pack's schedule (or the legacy per-query interval if
   * neither is set). Stripped by the serializer.
   */
  override_pack_schedule: boolean;
  /**
   * Pre-built RRULE config carried through the field array round-trip. Set on
   * load when the SO has a per-query override; otherwise undefined. Not bound
   * to the form UI directly — flat fields (`frequency`, `byweekday`, ...) are
   * the source of truth for the active form, and the serializer rebuilds this
   * value on submit.
   */
  rrule_schedule?: RRuleScheduleConfig;
}

const buildDefaultScheduleFields = (packDefaultSchedule?: ScheduleFormData): ScheduleFormData =>
  packDefaultSchedule ? { ...packDefaultSchedule } : { ...getDefaultScheduleFormValues() };

const deserializer = (
  payload: PackSOQueryFormData,
  packDefaultSchedule?: ScheduleFormData
): PackQueryFormData => {
  const baseScheduleFields = buildDefaultScheduleFields(packDefaultSchedule);

  const hasOverride = payload.schedule_type !== undefined;
  const scheduleFields: ScheduleFormData = hasOverride
    ? deserializeSchedule({
        schedule_type: payload.schedule_type,
        interval: payload.interval ? parseInt(payload.interval, 10) : undefined,
        rrule_schedule: payload.rrule_schedule,
      })
    : {
        ...baseScheduleFields,
        // Preserve the legacy per-query interval when present, even when no
        // override exists — so toggling the override on doesn't blow away the
        // value the user already had.
        interval: payload.interval ? parseInt(payload.interval, 10) : baseScheduleFields.interval,
      };

  return {
    ...scheduleFields,
    id: payload.id,
    query: payload.query,
    timeout: payload.timeout || QUERY_TIMEOUT.DEFAULT,
    snapshot: payload.snapshot,
    removed: payload.removed,
    platform: payload.platform,
    version: payload.version ? [payload.version] : [],
    ecs_mapping: payload.ecs_mapping ?? {},
    override_pack_schedule: hasOverride,
  };
};

/**
 * Form-state fields that exist purely for the ScheduleSection UI and must be
 * stripped before persisting the query. Listed once so the serializer can do a
 * single sweep without sprinkling `delete` calls.
 */
const FORM_ONLY_SCHEDULE_FIELDS = [
  'override_pack_schedule',
  'start_date',
  'end_date_enabled',
  'end_date',
  'splay_enabled',
  'splay_value',
  'splay_unit',
  'frequency',
  'repeat_every',
  'byweekday',
  'bymonthday',
  'bymonth',
] as const;

const serializer = (payload: PackQueryFormData): PackSOQueryFormData =>
  // @ts-expect-error legacy: produce loses the `interval: number → string`
  // narrowing across the form/SO boundary; keep the existing escape hatch.
  produce<PackQueryFormData>(payload, (draft: Draft<Record<string, unknown>>) => {
    if (isArray(draft.platform)) {
      if ((draft.platform as string[]).length) {
        draft.platform = (draft.platform as string[]).join(',');
      } else {
        delete draft.platform;
      }
    }

    if (isArray(draft.version)) {
      const versions = draft.version as string[];
      if (versions.length === 0) {
        delete draft.version;
      } else {
        draft.version = versions[0];
      }
    }

    if (isEmpty(draft.ecs_mapping)) {
      delete draft.ecs_mapping;
    }

    // Resolve schedule fields: when the user opts into a per-query override
    // we surface schedule_type + the active mode's payload; otherwise we strip
    // every schedule field so the server's fan-out can inherit the pack's.
    if (payload.override_pack_schedule) {
      const apiSchedule = serializeSchedule(payload);
      draft.schedule_type = apiSchedule.schedule_type;
      if (apiSchedule.schedule_type === 'rrule') {
        delete draft.interval;
        draft.rrule_schedule = apiSchedule.rrule_schedule;
      } else {
        delete draft.rrule_schedule;
        if (apiSchedule.interval !== undefined) {
          draft.interval = String(apiSchedule.interval);
        }
      }
    } else {
      delete draft.schedule_type;
      delete draft.rrule_schedule;
      // Preserve the legacy per-query interval when not overriding so the
      // server's case-5 fallback (no pack schedule) still has a value to use.
      if (payload.interval) {
        draft.interval = String(payload.interval);
      }
    }

    for (const field of FORM_ONLY_SCHEDULE_FIELDS) {
      delete draft[field];
    }

    return draft;
  });

const buildEmptyDefaults = (packDefaultSchedule?: ScheduleFormData): PackQueryFormData => ({
  ...buildDefaultScheduleFields(packDefaultSchedule),
  id: '',
  query: '',
  snapshot: true,
  removed: false,
  ecs_mapping: {},
  override_pack_schedule: false,
});

export const usePackQueryForm = ({
  uniqueQueryIds,
  defaultValue,
  packDefaultSchedule,
}: UsePackQueryFormProps) => {
  const idSet = useMemo<Set<string>>(
    () => new Set<string>(xor(uniqueQueryIds, defaultValue?.id ? [defaultValue.id] : [])),
    [uniqueQueryIds, defaultValue]
  );

  return {
    serializer,
    idSet,
    ...useHookForm<PackQueryFormData>({
      defaultValues: defaultValue
        ? deserializer(defaultValue, packDefaultSchedule)
        : buildEmptyDefaults(packDefaultSchedule),
    }),
  };
};
