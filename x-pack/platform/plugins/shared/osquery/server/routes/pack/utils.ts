/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isEmpty,
  pick,
  reduce,
  isArray,
  filter,
  uniq,
  map,
  mapKeys,
  has,
  unset,
  difference,
  intersection,
  flatMap,
} from 'lodash';
import { satisfies } from 'semver';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Shard } from '../../../common/utils/converters';
import { DEFAULT_PLATFORM } from '../../../common/constants';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common';
import { MAX_SPLAY_SECONDS } from '../../../common';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';
import { parseRRule } from '../../../common/utils/rrule_parser';
import {
  parseSplayPermissive,
  isSplayWithinHalfRecurrence,
} from '../../../common/utils/splay_utils';
import { safeDerivePeriodSeconds } from '../../../common/utils/rrule_period';

export interface PackQueryInput {
  name?: string;
  query: string;
  interval?: number;
  platform?: string;
  version?: string;
  snapshot?: boolean;
  removed?: boolean;
  timeout?: number;
  schedule_id?: string;
  start_date?: string;
  ecs_mapping?: Record<string, unknown>;
  /** Per-query schedule type override. */
  schedule_type?: ScheduleType;
  /** Per-query RRULE override (only present when `schedule_type === 'rrule'`). */
  rrule_schedule?: RRuleScheduleConfig;
}

export interface SOPackQuery extends Omit<PackQueryInput, 'name'> {
  id: string;
  name: string;
}

// Default pick list for pack query SOs — byte-identical to the pre-rrule
// shape. Used when `schedule_type` is unset (the only path under
// `rruleScheduling: false`) and when a query inherits the pack's schedule in
// interval mode.
const INTERVAL_MODE_PICK = [
  'name',
  'query',
  'interval',
  'platform',
  'version',
  'snapshot',
  'removed',
  'timeout',
  'schedule_id',
  'start_date',
] as const;

// Same fields minus `interval` — used when a query opts into rrule mode. The
// SO never carries both `interval` and `rrule_schedule` for one query (mutual
// exclusivity is enforced by building two disjoint pick lists rather than
// mutating one).
const RRULE_MODE_PICK = [
  'name',
  'query',
  'platform',
  'version',
  'snapshot',
  'removed',
  'timeout',
  'schedule_id',
  'start_date',
] as const;

export const convertPackQueriesToSO = (queries: Record<string, PackQueryInput>): SOPackQuery[] =>
  reduce(
    queries,
    (acc: SOPackQuery[], value: PackQueryInput, key: string) => {
      const ecsMapping = value.ecs_mapping
        ? convertECSMappingToArray(value.ecs_mapping as Record<string, object>)
        : undefined;

      const baseFields = pick(
        value,
        value.schedule_type === 'rrule' ? RRULE_MODE_PICK : INTERVAL_MODE_PICK
      );

      let scheduleOverride: Partial<SOPackQuery> = {};
      if (value.schedule_type === 'rrule') {
        scheduleOverride = pick(value, ['schedule_type', 'rrule_schedule']);
      } else if (value.schedule_type === 'interval') {
        scheduleOverride = pick(value, ['schedule_type']);
      } else if (value.rrule_schedule) {
        // Defense in depth (3.2.14): a query carries `rrule_schedule` without
        // `schedule_type`. The route validator rejects this earlier; we log so
        // any future code path that bypasses the validator is loud rather than
        // silently emitting RRULE-on-SO without the discriminator.

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            `convertPackQueriesToSO: query "${key}" carries rrule_schedule without schedule_type; dropping rrule_schedule.`
          );
        }
      }

      acc.push({
        id: key,
        ...baseFields,
        ...scheduleOverride,
        ...(ecsMapping ? { ecs_mapping: ecsMapping } : {}),
      } as SOPackQuery);

      return acc;
    },
    []
  );

export const convertSOQueriesToPack = (queries: SOPackQuery[] | Record<string, PackQueryInput>) =>
  reduce(
    queries as Record<string, SOPackQuery>,
    (
      acc: Record<string, PackQueryInput>,
      { id: queryId, ecs_mapping, query, platform, ...rest }: SOPackQuery,
      key: string
    ) => {
      const index = queryId ?? key;
      acc[index] = {
        ...rest,
        query,
        ...(!isEmpty(ecs_mapping)
          ? isArray(ecs_mapping)
            ? { ecs_mapping: convertECSMappingToObject(ecs_mapping) }
            : { ecs_mapping }
          : {}),
        ...(platform === DEFAULT_PLATFORM || platform === undefined ? {} : { platform }),
      };

      return acc;
    },
    {} as Record<string, PackQueryInput>
  );

/**
 * Pack-level schedule descriptor passed by route handlers (drawn from the
 * pack SO attributes after the route's gating logic).
 */
export interface PackScheduleInput {
  schedule_type?: ScheduleType | null;
  interval?: number | null;
  rrule_schedule?: RRuleScheduleConfig | null;
}

export interface ConvertSOQueriesToPackConfigOptions {
  spaceId?: string;
  packSchedule?: PackScheduleInput;
  /**
   * Wire-boundary rollback gate (D25). When `false`, ignore `packSchedule`
   * entirely (no `default_rrule_schedule`), drop per-query `rrule_schedule`,
   * fall back to per-query `interval` if present. `default_space_id`
   * continues to emit regardless of the flag.
   *
   * Default is `true` so existing tests retain semantics; production routes
   * MUST be explicit (`osqueryContext.experimentalFeatures.rruleScheduling`).
   */
  isRruleFeatureEnabled?: boolean;
}

export interface PackConfigOutput {
  default_native_schedule?: { interval: number };
  default_rrule_schedule?: RRuleScheduleConfig;
  default_space_id?: string;
  queries: Record<string, Record<string, unknown>>;
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }

  return out as T;
};

/**
 * Build the Fleet agent-policy `packs.{key}.queries` config plus pack-level
 * defaults from a pack's SO queries and optional pack-level schedule.
 *
 * Output shape (per design.md D8 / D13):
 *   {
 *     default_native_schedule?: { interval: number };
 *     default_rrule_schedule?: RRuleScheduleConfig;
 *     default_space_id?: string;
 *     queries: Record<queryId, { query, schedule_id, start_date, ...overrides }>;
 *   }
 *
 * Per-query fields are emitted ONLY when they override the pack default (or
 * when there is no pack default — legacy mode). The mode invariant is
 * preserved: no query carries both `interval` and `rrule_schedule`, and no
 * query carries a mode different from the pack default.
 */
export const convertSOQueriesToPackConfig = (
  queries: SOPackQuery[] | Record<string, PackQueryInput>,
  options: ConvertSOQueriesToPackConfigOptions = {}
): PackConfigOutput => {
  const { spaceId, packSchedule, isRruleFeatureEnabled = true } = options;

  const packMode: ScheduleType | undefined =
    isRruleFeatureEnabled && packSchedule?.schedule_type
      ? (packSchedule.schedule_type as ScheduleType)
      : packSchedule?.schedule_type === 'interval'
      ? 'interval'
      : undefined;
  // Note: when rrule flag is off and SO has `schedule_type: 'rrule'`, packMode
  // is `undefined` → legacy fan-out, RRULE state is ignored.

  const queriesOut: Record<string, Record<string, unknown>> = {};

  reduce(
    queries as SOPackQuery[],
    (
      _acc: null,
      {
        id: queryId,
        ecs_mapping,
        query,
        platform,
        removed,
        snapshot,
        interval,
        schedule_type: querySchedType,
        rrule_schedule: queryRrule,
        ...rest
      }: SOPackQuery,
      key: number
    ) => {
      const resultType = snapshot === false ? { removed, snapshot } : {};
      const index = queryId ? queryId : key;

      // Strip the mode-specific override fields from `rest`. We rebuild them
      // below according to the per-query / pack-mode rules so the output
      // never carries both `interval` and `rrule_schedule` on one query.
      const baseRest = { ...rest };

      let scheduleFields: Record<string, unknown> = {};

      if (!isRruleFeatureEnabled) {
        // Wire-boundary rollback gate (D25): ignore RRULE state entirely.
        // Fall back to legacy: per-query `interval` if present, otherwise
        // no schedule field on the query.
        if (interval !== undefined) {
          scheduleFields = { interval };
        }
      } else if (packMode === 'rrule') {
        // Pack runs rrule. Inherit by default; per-query override only when
        // the query opts into rrule explicitly. Any per-query `interval` on
        // the SO is stale — strip it (mode invariant).
        if (querySchedType === 'rrule' && queryRrule) {
          scheduleFields = { rrule_schedule: queryRrule };
        }
      } else if (packMode === 'interval') {
        // Pack runs interval. Inherit by default; per-query interval
        // override only when the query's `interval` differs from the pack
        // default. Any per-query `rrule_schedule` on the SO is stale.
        if (
          querySchedType === 'interval' &&
          interval !== undefined &&
          interval !== packSchedule?.interval
        ) {
          scheduleFields = { interval };
        } else if (
          querySchedType !== 'rrule' &&
          interval !== undefined &&
          interval !== packSchedule?.interval
        ) {
          // Legacy queries without explicit schedule_type but with an
          // interval different from the pack default still override.
          scheduleFields = { interval };
        }
      } else {
        // Legacy pack (no pack-level schedule): per-query `interval` only,
        // byte-identical to pre-feature output.
        if (interval !== undefined) {
          scheduleFields = { interval };
        }
      }

      queriesOut[index] = stripUndefined({
        ...baseRest,
        ...scheduleFields,
        query: removeMultilines(query),
        ...(!isEmpty(ecs_mapping)
          ? isArray(ecs_mapping)
            ? { ecs_mapping: convertECSMappingToObject(ecs_mapping) }
            : { ecs_mapping }
          : {}),
        ...(platform === DEFAULT_PLATFORM || platform === undefined ? {} : { platform }),
        ...resultType,
      });

      return null;
    },
    null
  );

  const output: PackConfigOutput = { queries: queriesOut };

  if (isRruleFeatureEnabled && packMode === 'rrule' && packSchedule?.rrule_schedule) {
    output.default_rrule_schedule = packSchedule.rrule_schedule;
  } else if (
    packMode === 'interval' &&
    packSchedule?.interval !== undefined &&
    packSchedule?.interval !== null
  ) {
    output.default_native_schedule = { interval: packSchedule.interval };
  }

  if (spaceId) {
    output.default_space_id = spaceId;
  }

  return output;
};

/**
 * Best-effort seconds extractor for compound Go duration strings (e.g. `"1h30m"`).
 * Only used by the splay 12h-cap check on compound values that `parseSplayPermissive`
 * accepts but does not decompose. Supports `h`, `m`, `s` (sub-second units like
 * `ms`/`us`/`ns` contribute 0 — they are not meaningful at pack-scheduler resolution).
 */
const GO_DURATION_SEGMENT = /(\d+(?:\.\d+)?)(ms|us|µs|ns|h|m|s)/g;
const goDurationToSeconds = (raw: string): number => {
  let total = 0;
  for (const m of raw.matchAll(GO_DURATION_SEGMENT)) {
    const n = Number(m[1]);
    switch (m[2]) {
      case 'h':
        total += n * 3600;
        break;
      case 'm':
        total += n * 60;
        break;
      case 's':
        total += n;
        break;
      // ms/us/µs/ns: drop — they cannot push past MAX_SPLAY_SECONDS on
      // practical inputs and we are only checking the 12-hour ceiling.
    }
  }

  return total;
};

/**
 * Format a duration in seconds as a Go-style duration string (e.g. `"1h0m0s"`,
 * `"5m0s"`, `"30s"`). Mirrors the beats log format for the splay error message
 * so the Kibana `400` message is directly searchable alongside agent logs.
 */
const formatGoDurationSeconds = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;

  return `${s}s`;
};

/**
 * Strict RFC 3339 datetime regex matching the OpenAPI Zod `.datetime()` shape
 * and beats's `time.Parse(time.RFC3339, ...)` parser (D15). Requires:
 * - YYYY-MM-DD
 * - `T` separator (uppercase)
 * - HH:MM:SS
 * - Optional fractional seconds
 * - Timezone offset `Z` or `±HH:MM`
 */
const RFC_3339_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Strict RFC 3339 datetime validator (D15). Rejects loose strings like
 * `"2024-01-01"` (no time component) which `Date.parse` would accept.
 */
export const isValidRfc3339 = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  if (!RFC_3339_REGEX.test(value)) return false;
  // Defensive: regex matches `2024-13-40T...` — verify with Date parse.
  const t = Date.parse(value);

  return !Number.isNaN(t);
};

/**
 * Validate an `RRuleScheduleConfig` object at the API request boundary
 * (D11/D12/D15/D24/D26). Returns `null` on success or a human-readable error
 * message on failure.
 *
 * @param recurrenceSeconds - Conservative lower bound of the RRULE period in
 *   seconds (derived by the caller via {@link safeDerivePeriodSeconds}). When
 *   provided, the splay is also checked against the half-period rule enforced
 *   by osquerybeat (D26): `splay ≤ period / 2`. When omitted, only the
 *   absolute 12h cap is checked (backward-compatible behaviour).
 */
export const validateRruleConfig = (
  config: RRuleScheduleConfig,
  recurrenceSeconds?: number
): string | null => {
  if (!config || typeof config !== 'object') {
    return 'rrule_schedule must be an object';
  }

  if (typeof config.rrule !== 'string' || config.rrule.length === 0) {
    return 'rrule_schedule.rrule is required and must be a non-empty string';
  }

  // String-length cap (3.2.11) — defense at the API edge against blob-sized
  // RRULE strings even though SO `unknowns: 'allow'` would persist them.
  if (config.rrule.length > 2048) {
    return 'rrule_schedule.rrule must not exceed 2048 characters';
  }

  // D24: parse the string with the actual parser so malformed RRULEs never
  // reach beats.
  try {
    parseRRule(config.rrule);
  } catch (err) {
    return `rrule_schedule.rrule is invalid: ${(err as Error).message}`;
  }

  if (!isValidRfc3339(config.start_date)) {
    return 'rrule_schedule.start_date must be an RFC 3339 datetime (e.g. 2024-01-01T00:00:00Z)';
  }

  if (config.end_date !== undefined) {
    if (!isValidRfc3339(config.end_date)) {
      return 'rrule_schedule.end_date must be an RFC 3339 datetime (e.g. 2024-01-01T00:00:00Z)';
    }

    if (Date.parse(config.end_date) <= Date.parse(config.start_date)) {
      return 'rrule_schedule.end_date must be after rrule_schedule.start_date';
    }
  }

  if (config.splay !== undefined) {
    if (typeof config.splay !== 'string') {
      return 'rrule_schedule.splay must be a string';
    }

    if (config.splay.length > 64) {
      return 'rrule_schedule.splay must not exceed 64 characters';
    }

    let parsed;
    try {
      parsed = parseSplayPermissive(config.splay);
    } catch (err) {
      return `rrule_schedule.splay is invalid: ${(err as Error).message}`;
    }

    const seconds =
      parsed.kind === 'simple'
        ? parsed.value * ({ seconds: 1, minutes: 60, hours: 3600 }[parsed.unit] as number)
        : goDurationToSeconds(parsed.raw);
    if (seconds > MAX_SPLAY_SECONDS) {
      return `rrule_schedule.splay must not exceed ${MAX_SPLAY_SECONDS} seconds (12 hours)`;
    }

    if (
      recurrenceSeconds !== undefined &&
      !isSplayWithinHalfRecurrence(seconds, recurrenceSeconds)
    ) {
      const halfStr = formatGoDurationSeconds(Math.floor(recurrenceSeconds / 2));
      const periodStr = formatGoDurationSeconds(recurrenceSeconds);
      const gotStr = formatGoDurationSeconds(seconds);

      return `rrule_schedule.splay must be at most ${halfStr} (half of minimum interval ${periodStr}), got: ${gotStr}`;
    }
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      return 'rrule_schedule.timeout must be a positive number (seconds)';
    }
  }

  return null;
};

export interface ResolvedPackSchedule {
  scheduleType: ScheduleType | undefined;
  interval: number | null | undefined;
  rrule_schedule: RRuleScheduleConfig | null | undefined;
  transitioned: boolean;
}

export const resolvePackScheduleForUpdate = ({
  current,
  request,
  isRruleFeatureEnabled,
}: {
  current: {
    schedule_type?: ScheduleType | null;
    interval?: number | null;
    rrule_schedule?: RRuleScheduleConfig | null;
  };
  request: {
    schedule_type?: ScheduleType | null;
    interval?: number | null;
    rrule_schedule?: RRuleScheduleConfig | null;
    scheduleTypePresent: boolean;
    intervalPresent: boolean;
    rruleSchedulePresent: boolean;
  };
  isRruleFeatureEnabled: boolean;
}): ResolvedPackSchedule => {
  if (!isRruleFeatureEnabled) {
    return {
      scheduleType: current.schedule_type ?? undefined,
      interval: current.interval ?? undefined,
      rrule_schedule: current.rrule_schedule ?? undefined,
      transitioned: false,
    };
  }

  const scheduleType = request.scheduleTypePresent
    ? request.schedule_type ?? undefined
    : current.schedule_type ?? undefined;

  const transitioned =
    request.scheduleTypePresent && request.schedule_type !== current.schedule_type;

  let interval: number | null | undefined;
  if (request.intervalPresent) {
    interval = request.interval ?? null;
  } else if (transitioned && scheduleType !== 'interval') {
    interval = null;
  } else {
    interval = current.interval ?? undefined;
  }

  let rruleSchedule: RRuleScheduleConfig | null | undefined;
  if (request.rruleSchedulePresent) {
    rruleSchedule = request.rrule_schedule ?? null;
  } else if (transitioned && scheduleType !== 'rrule') {
    rruleSchedule = null;
  } else {
    rruleSchedule = current.rrule_schedule ?? undefined;
  }

  return { scheduleType, interval, rrule_schedule: rruleSchedule, transitioned };
};

/**
 * Validate the schedule fields on a pack-level create/update body and on
 * each per-query override. Enforces:
 * - Mutual exclusivity (no both `interval` and `rrule_schedule`).
 * - Pack-level discriminator presence when fields are present.
 * - Per-query same-mode constraint (D11): every override SHALL match the
 *   pack's schedule_type.
 * - Field-level validity via `validateRruleConfig` (RFC 3339, parseability,
 *   splay cap, end_date > start_date).
 *
 * Returns `null` on success or a human-readable error message on failure.
 */
export const validatePackScheduleFields = ({
  packScheduleType,
  packInterval,
  packRrule,
  queries,
}: {
  packScheduleType?: ScheduleType | null;
  packInterval?: number | null;
  packRrule?: RRuleScheduleConfig | null;
  queries?: Record<string, Pick<PackQueryInput, 'interval' | 'schedule_type' | 'rrule_schedule'>>;
}): string | null => {
  // Pack-level mutual exclusivity.
  if (packInterval !== undefined && packInterval !== null && packRrule) {
    return 'Pack cannot specify both pack-level interval and rrule_schedule';
  }

  // Pack-level discriminator: if schedule_type is set, the matching field
  // must be present; if a schedule field is set, schedule_type must match.
  if (packScheduleType === 'rrule') {
    if (!packRrule) {
      return 'Pack schedule_type "rrule" requires rrule_schedule';
    }

    const packPeriodSeconds = safeDerivePeriodSeconds(packRrule.rrule);
    const err = validateRruleConfig(packRrule, packPeriodSeconds);
    if (err) return err;
  } else if (packScheduleType === 'interval') {
    if (packInterval === undefined || packInterval === null) {
      return 'Pack schedule_type "interval" requires pack-level interval';
    }

    if (typeof packInterval !== 'number' || packInterval <= 0) {
      return 'Pack interval must be a positive number (seconds)';
    }
  } else {
    // schedule_type unset: do not allow standalone pack-level interval /
    // rrule_schedule without the discriminator.
    if (packRrule) {
      return 'Pack rrule_schedule requires schedule_type "rrule"';
    }

    if (packInterval !== undefined && packInterval !== null) {
      return 'Pack interval requires schedule_type "interval"';
    }
  }

  if (!queries) return null;

  for (const [queryId, q] of Object.entries(queries)) {
    // Per-query mutual exclusivity.
    if (q.interval !== undefined && q.rrule_schedule) {
      return `Query "${queryId}" cannot specify both interval and rrule_schedule`;
    }

    if (q.schedule_type === 'rrule') {
      if (!q.rrule_schedule) {
        return `Query "${queryId}" schedule_type "rrule" requires rrule_schedule`;
      }

      const queryPeriodSeconds =
        safeDerivePeriodSeconds(q.rrule_schedule.rrule) ??
        (packRrule ? safeDerivePeriodSeconds(packRrule.rrule) : undefined);
      const err = validateRruleConfig(q.rrule_schedule, queryPeriodSeconds);
      if (err) return `Query "${queryId}": ${err}`;
    } else if (q.schedule_type === 'interval') {
      if (q.interval !== undefined && (typeof q.interval !== 'number' || q.interval <= 0)) {
        return `Query "${queryId}" interval must be a positive number (seconds)`;
      }
    }

    // Same-mode constraint (D11) — when the pack has a mode, every query
    // override SHALL match.
    if (packScheduleType && q.schedule_type && q.schedule_type !== packScheduleType) {
      return `Query "${queryId}" schedule_type "${q.schedule_type}" does not match pack schedule_type "${packScheduleType}"; per-query overrides must use the same mode as the pack (D11)`;
    }

    if (packScheduleType === 'rrule' && q.interval !== undefined) {
      return `Query "${queryId}" carries interval but the pack uses schedule_type "rrule"; per-query overrides must use the same mode as the pack (D11)`;
    }

    if (packScheduleType === 'interval' && q.rrule_schedule) {
      return `Query "${queryId}" carries rrule_schedule but the pack uses schedule_type "interval"; per-query overrides must use the same mode as the pack (D11)`;
    }
  }

  return null;
};

export const policyHasPack = (
  packagePolicy: PackagePolicy,
  packName: string,
  spaceId: string
): boolean =>
  has(packagePolicy, `inputs[0].config.osquery.value.packs.${spaceId}--${packName}`) ||
  has(packagePolicy, `inputs[0].config.osquery.value.packs.${packName}`);

export const removePackFromPolicy = (
  draft: PackagePolicy,
  packName: string,
  spaceId: string
): void => {
  unset(draft, `inputs[0].config.osquery.value.packs.${spaceId}--${packName}`);
  unset(draft, `inputs[0].config.osquery.value.packs.${packName}`);
};

export const makePackKey = (packName: string, spaceId: string) => `${spaceId}--${packName}`;
export const getInitialPolicies = (
  packagePolicies: PackagePolicy[] | never[],
  policyIds: string[] = [],
  shards?: Shard
): { policiesList: string[]; invalidPolicies?: string[] } => {
  const supportedPackagePolicies = filter(packagePolicies, (packagePolicy) =>
    satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
  );

  const supportedPackagePolicyIds = uniq(flatMap(supportedPackagePolicies, 'policy_ids'));
  // we want to find all policies, because this is a global pack
  if (shards?.['*']) {
    return { policiesList: supportedPackagePolicyIds };
  }

  // Return only policyIds that are present in supportedPackagePolicyIds
  const policiesList = intersection(uniq(policyIds), supportedPackagePolicyIds);
  // Collect leftover policyIds
  const invalidPolicies = difference(uniq(policyIds), policiesList);

  return {
    policiesList,
    ...(invalidPolicies.length && { invalidPolicies }),
  };
};

export const findMatchingShards = (agentPolicies: AgentPolicy[] | undefined, shards?: Shard) => {
  const policyShards: Shard = {};
  if (!isEmpty(shards)) {
    const agentPoliciesIdMap = mapKeys(agentPolicies, 'id');

    map(shards, (shard, shardName) => {
      if (agentPoliciesIdMap[shardName]) {
        policyShards[agentPoliciesIdMap[shardName].id] = shard;
      }
    });
  }

  return policyShards;
};
