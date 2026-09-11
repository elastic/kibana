/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, xor } from 'lodash';
import { useForm as useHookForm } from 'react-hook-form';
import type { Draft } from 'immer-v9';
import { produce } from 'immer-v9';
import { useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { DEFAULT_PLATFORM, QUERY_TIMEOUT } from '../../../common/constants';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common/schedule';
import type { ResultType } from '../../../common/result_type';
import {
  mapResultTypeToWire,
  mapWireToResultType,
  mapWireToExplicitResultType,
} from '../../../common/result_type';
import type { Shard } from '../../../common/utils/converters';
import type { ScheduleFormData } from '../../components/schedule_section/types';
import type { DeserializeScheduleInput } from '../form/schedule_serializer';
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
    // Whether the pack SO actually persisted this schedule (true), vs. the
    // client synthesizing an interval-mode default purely so the pack form
    // has something to render for a legacy pack that predates schedule_type
    // (false/undefined). Only a real pack-level schedule is a legitimate
    // inheritance target for a non-override query — see elastic/kibana#277700.
    hasExplicitSchedule?: boolean;
  };
  /** Pack-level min osquery version default (V5). When set, the flyout shows an override toggle. */
  packMinOsqueryVersion?: string;
  /** Pack-level result type default (V5). When set, the flyout shows an override toggle. */
  packResultType?: ResultType;
  /** Pack-level platform default (V5). When set, the flyout shows an override toggle. */
  packPlatform?: string;
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
  /** Per-query enabled flag. When false the query is filtered from the Fleet emit. Default: true. */
  enabled?: boolean;
  /** Per-query result type override. Only present when it differs from the pack default. */
  result_type?: ResultType;
  /**
   * Form-only flag: whether this query overrides the pack's execution defaults
   * (min osquery version / result type / platform). Never persisted.
   */
  override_pack_defaults?: boolean;
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
  /** Whether this query is enabled. When false it is filtered from the Fleet emit. Default: true. */
  enabled?: boolean;
  /** Per-query result type override value. */
  result_type?: ResultType;
  /**
   * When true, this query overrides the pack's execution defaults. A single
   * toggle governs min osquery version, result type and platform together;
   * the serializer still emits only the individual fields whose value actually
   * differs from the pack default, so an unchanged field keeps inheriting.
   */
  override_pack_defaults?: boolean;
}

const isSameScheduleMode = (
  packScheduleType: ScheduleType | undefined,
  queryScheduleType: ScheduleType | undefined
): boolean => packScheduleType === undefined || packScheduleType === queryScheduleType;

const stripInheritedScheduleFields = (
  base: PackSOQueryFormData,
  packScheduleType: ScheduleType | undefined,
  hasExplicitPackSchedule: boolean
): PackSOQueryFormData => {
  if (packScheduleType === 'rrule') {
    const { interval: _interval, timeout: _timeout, ...stripped } = base;

    return stripped as PackSOQueryFormData;
  }

  // Only strip the query's own interval when the pack genuinely persisted an
  // interval-mode schedule. A legacy pack with no real pack-level schedule
  // still reports `packScheduleType === 'interval'` (the client synthesizes
  // that default so the form has something to render), but there the query's
  // own interval is authoritative and must survive the round-trip.
  if (packScheduleType === 'interval' && hasExplicitPackSchedule) {
    const { interval: _interval, ...stripped } = base;

    return stripped as PackSOQueryFormData;
  }

  return base;
};

/**
 * Resolve the schedule a non-override query inherits. Inheriting is only
 * meaningful when the pack schedule is a real one — either the pack SO
 * actually persisted an interval schedule (`hasExplicitSchedule`) or the pack
 * is in recurrence mode (rrule schedules only ever come from an explicit
 * pack-level choice, never a synthesized default). Otherwise (legacy pack,
 * no real pack-level schedule) the query's own interval is authoritative.
 */
export const resolveInheritedScheduleInput = (
  packSchedule: UsePackQueryFormProps['packSchedule'],
  queryInterval: number | undefined
): DeserializeScheduleInput => {
  const inheritsRealPackSchedule =
    packSchedule?.schedule_type === 'rrule' || !!packSchedule?.hasExplicitSchedule;

  if (inheritsRealPackSchedule) {
    return {
      schedule_type: packSchedule?.schedule_type,
      interval: packSchedule?.interval,
      rrule_schedule: packSchedule?.rrule_schedule,
    };
  }

  return { schedule_type: 'interval', interval: queryInterval };
};

/**
 * Deserializes the query's own override, or falls back to the inherited
 * pack schedule (resolved via `resolveInheritedScheduleInput` so a legacy
 * pack's synthesized default never clobbers the query's own interval).
 * Reused for both `defaultValues.schedule` and `originalStartDate` so they
 * can't diverge.
 */
const deserializeQuerySchedule = (
  payload: PackSOQueryFormData | undefined,
  packSchedule?: UsePackQueryFormProps['packSchedule']
): ScheduleFormData => {
  const hasOverride = payload?.schedule_type !== undefined;
  const queryInterval = payload?.interval ? parseInt(payload.interval, 10) : undefined;

  return hasOverride
    ? deserializeSchedule({
        schedule_type: payload?.schedule_type,
        interval: queryInterval,
        rrule_schedule: payload?.rrule_schedule,
      })
    : deserializeSchedule(resolveInheritedScheduleInput(packSchedule, queryInterval));
};

const deserializer = (
  payload: PackSOQueryFormData,
  deserializedSchedule: ScheduleFormData,
  packMinOsqueryVersion?: string,
  packResultType?: ResultType,
  packPlatform?: string
): PackQueryFormData => {
  const hasOverride = payload.schedule_type !== undefined;
  const queryInterval = payload.interval ? parseInt(payload.interval, 10) : undefined;

  // The single toggle is ON when this query stores its own value for any of
  // the three execution defaults.
  //
  // Deliberately *not* gated on the matching pack default. The toggle governs
  // all three fields at once, so a query that stores a platform while the pack
  // only defaults a result type still holds a value the toggle is responsible
  // for. Gating each predicate on its own pack default rendered the toggle OFF
  // while the disabled controls displayed the query's real values — the state
  // shown did not match the state stored.
  //
  // `result_type` is read alongside the legacy `snapshot`/`removed` pair so a
  // pre-V5 query that only ever stored the booleans is still recognised as
  // holding its own result type.
  //
  // Two different decoders are needed here, because "what should the control
  // display" and "does this query hold an override" are different questions:
  //
  //  - display uses the faithful inverse, so a query storing `snapshot: true`
  //    still renders as Snapshot;
  //  - the override predicate uses the explicit-only decoder, because the
  //    flyout used to seed `snapshot: true, removed: false` into every new
  //    query. Counting that pair as an override would force the toggle ON for
  //    virtually every pre-existing query in every pack.
  const storedResultType =
    payload.result_type ??
    mapWireToResultType({ snapshot: payload.snapshot, removed: payload.removed });
  const hasStoredResultType =
    (payload.result_type ??
      mapWireToExplicitResultType({ snapshot: payload.snapshot, removed: payload.removed })) !==
    undefined;
  const hasVersionOverride = payload.version !== undefined;
  // Not gated on `packResultType`, matching the two predicates around it. The
  // toggle governs all three fields at once, so gating this one alone rendered
  // the toggle OFF while the enabled Result type control displayed the query's
  // own stored value — the state shown did not match the state stored.
  const hasResultTypeOverride = hasStoredResultType;
  const hasPlatformOverride = !!payload.platform;
  const hasAnyOverride = hasVersionOverride || hasResultTypeOverride || hasPlatformOverride;

  // Seed each execution-default field with the pack's value when the query has
  // none of its own, so the (disabled) controls show what the query actually
  // inherits rather than the field's own hardcoded default. The serializer
  // drops any value equal to the pack default, so seeding cannot turn an
  // inheriting query into an overriding one.
  const effectivePlatform = payload.platform || packPlatform || DEFAULT_PLATFORM;
  const effectiveVersion = payload.version ?? packMinOsqueryVersion;
  // The query's own stored type (including a legacy boolean-only one) wins
  // over the pack default, otherwise opening a legacy differential query in a
  // pack that defaults to snapshot would display — and then save — snapshot.
  const effectiveResultType = storedResultType ?? packResultType;

  // `ResultsTypeField` derives its display from the `snapshot`/`removed`
  // booleans, not from `result_type`, so the inherited value has to be
  // projected onto them. `mapResultTypeToWire` returns `{}` for 'snapshot'
  // (absence means snapshot on the wire), which the field reads as
  // `snapshot: undefined` → falsy → Differential. Default explicitly instead.
  const inheritedResultBooleans =
    effectiveResultType !== undefined
      ? { snapshot: true, removed: false, ...mapResultTypeToWire(effectiveResultType) }
      : { snapshot: payload.snapshot, removed: payload.removed };

  return {
    id: payload.id,
    query: payload.query,
    interval: queryInterval ?? 3600,
    timeout: payload.timeout || QUERY_TIMEOUT.DEFAULT,
    ...inheritedResultBooleans,
    platform: effectivePlatform,
    version: effectiveVersion ? [effectiveVersion] : [],
    ecs_mapping: payload.ecs_mapping ?? {},
    override_pack_schedule: hasOverride,
    schedule: deserializedSchedule,
    override_pack_defaults: hasAnyOverride,
    ...(effectiveResultType !== undefined ? { result_type: effectiveResultType } : {}),
    ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
  };
};

interface PackDefaultsForSerializer {
  packMinOsqueryVersion?: string;
  packResultType?: ResultType;
  packPlatform?: string;
}

const serializer = (
  payload: PackQueryFormData,
  packSchedule?: UsePackQueryFormProps['packSchedule'],
  packDefaults: PackDefaultsForSerializer = {}
): PackSOQueryFormData => {
  // The schedule fields live outside the immer-produced shape because the
  // PackSOQueryFormData wire type tightens `schedule_type` / `rrule_schedule`
  // and drops `override_pack_schedule` / `schedule`.
  const {
    override_pack_schedule: overridePackSchedule,
    override_pack_defaults: overridePackDefaults,
    schedule,
    ...rest
  } = payload;

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

      // A single toggle governs all three execution defaults. When it is OFF
      // the query inherits every one of them, so none are emitted.
      //
      // When it is ON we still emit only the fields whose value actually
      // differs from the pack default: a query that overrides just the OS
      // keeps inheriting version and result type, so a later pack-level change
      // still reaches it. `override_pack_defaults === undefined` means the pack
      // has no defaults at all (the toggle is hidden), in which case the
      // per-query fields are the sole source and are emitted unconditionally.
      if (overridePackDefaults === false) {
        // Each delete is gated on the *matching* pack default. The toggle is
        // shown when the pack has any one of the three defaults, so an
        // ungated delete here would erase a per-query value for a field the
        // pack has no default for — the query would inherit nothing and
        // silently lose its own setting (an OS restriction or version floor
        // dropped on a pack whose only default is a result type).
        if (packDefaults.packMinOsqueryVersion) {
          delete draft.version;
        }

        if (packDefaults.packPlatform) {
          delete draft.platform;
        }

        // The deserializer seeds `snapshot`/`removed` from the pack's result
        // type so the disabled control displays the inherited value. Those are
        // display-only for an inheriting query: leaving `snapshot: false` on
        // the wire would hit the server's legacy branch
        // (`snapshot === false ? { removed, snapshot } : {}`) and be read as an
        // explicit per-query differential override.
        if (packDefaults.packResultType) {
          delete draft.result_type;
          delete draft.snapshot;
          delete draft.removed;
        }
      } else if (overridePackDefaults === true) {
        if (
          packDefaults.packMinOsqueryVersion &&
          draft.version === packDefaults.packMinOsqueryVersion
        ) {
          delete draft.version;
        }

        // Drop the companion booleans alongside `result_type`, not just
        // `result_type` itself. The deserializer seeds `snapshot`/`removed`
        // from the effective result type so the control can display it, so a
        // query that overrides only (say) the OS still carries a seeded pair
        // here. Deleting `result_type` while leaving that pair behind sends the
        // pack default's own value back as a per-query field, where the server
        // decodes it as an explicit override — and a later pack-level change
        // would then never reach this query, the exact opposite of inheriting.
        if (packDefaults.packResultType && draft.result_type === packDefaults.packResultType) {
          delete draft.result_type;
          delete draft.snapshot;
          delete draft.removed;
        }

        if (packDefaults.packPlatform && draft.platform === packDefaults.packPlatform) {
          delete draft.platform;
        }
      }

      return draft;
    }
  );

  const hasExplicitPackSchedule = !!packSchedule?.hasExplicitSchedule;

  if (!overridePackSchedule || !schedule) {
    return stripInheritedScheduleFields(base, packSchedule?.schedule_type, hasExplicitPackSchedule);
  }

  const serialized = serializeSchedule(schedule);
  if (!isSameScheduleMode(packSchedule?.schedule_type, serialized.schedule_type)) {
    return stripInheritedScheduleFields(base, packSchedule?.schedule_type, hasExplicitPackSchedule);
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
  packMinOsqueryVersion,
  packResultType,
  packPlatform,
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
    serializer: (payload: PackQueryFormData) =>
      serializer(payload, packSchedule, { packMinOsqueryVersion, packResultType, packPlatform }),
    idSet,
    deserializedSchedule,
    ...useHookForm<PackQueryFormData>({
      defaultValues: defaultValue
        ? deserializer(
            defaultValue,
            deserializedSchedule,
            packMinOsqueryVersion,
            packResultType,
            packPlatform
          )
        : {
            id: '',
            query: '',
            interval: 3600,
            // Seed a new query from the pack's execution defaults so the
            // disabled controls show what it will actually inherit.
            ...(packResultType
              ? { snapshot: true, removed: false, ...mapResultTypeToWire(packResultType) }
              : { snapshot: true, removed: false }),
            platform: packPlatform || DEFAULT_PLATFORM,
            version: packMinOsqueryVersion ? [packMinOsqueryVersion] : [],
            override_pack_schedule: false,
            override_pack_defaults: false,
            schedule: deserializedSchedule,
          },
    }),
  };
};
