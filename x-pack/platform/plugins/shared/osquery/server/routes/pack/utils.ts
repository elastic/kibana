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
  mapValues,
} from 'lodash';
import { satisfies } from 'semver';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Shard } from '../../../common/utils/converters';
import { DEFAULT_PLATFORM } from '../../../common/constants';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common';
import { MAX_SPLAY_SECONDS } from '../../../common';
import { isSplayWithinMax, parseSplay } from '../../../common/utils/splay_utils';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

export interface PackQueryInput {
  name?: string;
  query: string;
  /**
   * Legacy per-query interval (seconds). Optional because a query may opt out
   * of interval scheduling via `schedule_type: 'rrule'` + `rrule_schedule`,
   * in which case `interval` is intentionally omitted from the SO and the
   * Fleet config (see `convertPackQueriesToSO` and
   * `convertSOQueriesToPackConfig`).
   */
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

/**
 * Pack-level schedule fields, used to fan out the pack's default schedule onto
 * queries that don't have their own override.
 */
export interface PackSchedule {
  schedule_type?: ScheduleType;
  /** Pack-level interval (seconds). Set when `schedule_type === 'interval'`. */
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
}

export interface SOPackQuery extends Omit<PackQueryInput, 'name'> {
  id: string;
  name: string;
}

export const convertPackQueriesToSO = (queries: Record<string, PackQueryInput>): SOPackQuery[] =>
  reduce(
    queries,
    (acc: SOPackQuery[], value: PackQueryInput, key: string) => {
      const ecsMapping = value.ecs_mapping
        ? convertECSMappingToArray(value.ecs_mapping as Record<string, object>)
        : undefined;

      // Mutual exclusivity at the per-query override level: when the query
      // explicitly opts into one schedule mode, only that mode's fields are
      // picked. Without `schedule_type` we keep legacy behavior (interval).
      const baseFields = [
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

      const scheduleFields: Array<keyof PackQueryInput> =
        value.schedule_type === 'rrule'
          ? ['schedule_type', 'rrule_schedule']
          : value.schedule_type === 'interval'
          ? ['schedule_type', 'interval']
          : ['interval'];

      acc.push({
        id: key,
        ...pick(value, [...baseFields, ...scheduleFields]),
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
 * Converts stored pack queries into the Fleet-facing config each policy ships
 * to osquerybeat. This is also where the pack-level schedule (interval or
 * RRULE) is "fanned out" onto each query.
 *
 * Fan-out priority (per query):
 *
 * 1. Per-query override with `schedule_type === 'rrule'` wins — emit the
 *    query's own `rrule_schedule`, strip `interval`.
 * 2. Per-query override with `schedule_type === 'interval'` wins — emit the
 *    query's own `interval`, strip `rrule_schedule`.
 * 3. No per-query override, pack is on RRULE — stamp pack's `rrule_schedule`
 *    onto the query, strip `interval`.
 * 4. No per-query override, pack is on interval — stamp pack's `interval`
 *    onto the query, strip `rrule_schedule`.
 * 5. Legacy (no pack schedule, no per-query override) — preserve the query's
 *    own `interval`, unchanged.
 *
 * Mutual exclusivity: a fanned-out query always has `interval` XOR
 * `rrule_schedule`, never both.
 *
 * `schedule_type` is an internal Kibana discriminator and is intentionally not
 * emitted to Fleet — osquerybeat only checks for `rrule_schedule` presence.
 */
export const convertSOQueriesToPackConfig = (
  queries: SOPackQuery[] | Record<string, PackQueryInput>,
  spaceId?: string,
  packSchedule?: PackSchedule
) =>
  reduce(
    queries as SOPackQuery[],
    (
      acc: Record<string, Record<string, unknown>>,
      { id: queryId, ecs_mapping, query, platform, removed, snapshot, ...rest }: SOPackQuery,
      key: number
    ) => {
      const resultType = snapshot === false ? { removed, snapshot } : {};
      const index = queryId ? queryId : key;

      const {
        interval: queryInterval,
        schedule_type: querySchedule,
        rrule_schedule: queryRrule,
        ...remaining
      } = rest;

      let scheduleFields: Record<string, unknown>;
      if (querySchedule === 'rrule' && queryRrule) {
        scheduleFields = { rrule_schedule: queryRrule };
      } else if (querySchedule === 'interval' && queryInterval != null) {
        scheduleFields = { interval: queryInterval };
      } else if (packSchedule?.schedule_type === 'rrule' && packSchedule.rrule_schedule) {
        scheduleFields = { rrule_schedule: packSchedule.rrule_schedule };
      } else if (packSchedule?.schedule_type === 'interval' && packSchedule.interval != null) {
        scheduleFields = { interval: packSchedule.interval };
      } else {
        scheduleFields = queryInterval != null ? { interval: queryInterval } : {};
      }

      acc[index] = {
        ...remaining,
        ...scheduleFields,
        query: removeMultilines(query),
        ...(!isEmpty(ecs_mapping)
          ? isArray(ecs_mapping)
            ? { ecs_mapping: convertECSMappingToObject(ecs_mapping) }
            : { ecs_mapping }
          : {}),
        ...(platform === DEFAULT_PLATFORM || platform === undefined ? {} : { platform }),
        ...resultType,
        ...(spaceId ? { space_id: spaceId } : {}),
      };

      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );

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

/**
 * Subset of fields shared by pack-level and per-query inputs that participate
 * in scheduling. The helper is structural rather than typed against the route
 * body so it can validate both shapes uniformly.
 */
interface ScheduleInputFields {
  schedule_type?: ScheduleType;
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
}

const isValidIsoDate = (value: string): boolean => {
  const ts = Date.parse(value);

  return !Number.isNaN(ts);
};

const validateRruleConfig = (config: RRuleScheduleConfig): string | null => {
  if (!config.rrule || typeof config.rrule !== 'string' || config.rrule.trim() === '') {
    return '`rrule_schedule.rrule` must be a non-empty RFC 5545 string';
  }

  if (!config.start_date || !isValidIsoDate(config.start_date)) {
    return '`rrule_schedule.start_date` must be a valid ISO 8601 datetime string';
  }

  if (config.end_date != null) {
    if (!isValidIsoDate(config.end_date)) {
      return '`rrule_schedule.end_date` must be a valid ISO 8601 datetime string';
    }

    if (Date.parse(config.end_date) <= Date.parse(config.start_date)) {
      return '`rrule_schedule.end_date` must be after `rrule_schedule.start_date`';
    }
  }

  if (config.splay != null) {
    let parsed;
    try {
      parsed = parseSplay(config.splay);
    } catch (err) {
      return `\`rrule_schedule.splay\` is invalid: ${err.message}`;
    }

    if (!isSplayWithinMax(parsed)) {
      return `\`rrule_schedule.splay\` exceeds the maximum of ${MAX_SPLAY_SECONDS} seconds (1 hour)`;
    }
  }

  return null;
};

/**
 * Validates pack-level OR per-query schedule fields. Used by route handlers
 * before persisting the pack SO so the API rejects inputs that would be
 * silently coerced by `convertSOQueriesToPackConfig`.
 *
 * Pack-level rules:
 *  - When `interval` or `rrule_schedule` is present, `schedule_type` is required.
 *  - `schedule_type === 'rrule'` requires `rrule_schedule` and forbids `interval`.
 *  - `schedule_type === 'interval'` requires `interval` and forbids `rrule_schedule`.
 *
 * Per-query rules: identical, except `interval` may also be present without
 * `schedule_type` (legacy behavior — the existing per-query interval mode).
 */
export const validateScheduleFields = (
  scope: 'pack' | 'query',
  fields: ScheduleInputFields
): string | null => {
  const { schedule_type: type, interval, rrule_schedule: rrule } = fields;

  if (type === 'rrule') {
    if (!rrule) {
      return `\`schedule_type: 'rrule'\` requires \`rrule_schedule\``;
    }

    if (interval != null) {
      return `\`schedule_type: 'rrule'\` is mutually exclusive with \`interval\``;
    }

    return validateRruleConfig(rrule);
  }

  if (type === 'interval') {
    if (interval == null) {
      return `\`schedule_type: 'interval'\` requires \`interval\``;
    }

    if (rrule) {
      return `\`schedule_type: 'interval'\` is mutually exclusive with \`rrule_schedule\``;
    }

    return null;
  }

  // No `schedule_type` set:
  //  - Pack scope: any presence of new pack-level scheduling fields requires an
  //    explicit `schedule_type` so we never silently emit ambiguous configs.
  //  - Query scope: legacy per-query `interval` is allowed bare; only RRULE
  //    presence forces an explicit discriminator.
  if (scope === 'pack' && (interval != null || rrule)) {
    return '`schedule_type` is required when `interval` or `rrule_schedule` is provided';
  }

  if (scope === 'query' && rrule) {
    return '`schedule_type` is required when `rrule_schedule` is provided';
  }

  return null;
};

/**
 * Strips pack-level RRULE/scheduling fields and per-query RRULE override fields
 * from a request body. Used when the `rruleScheduling` feature flag is off so
 * unknown fields do not leak into the SO or Fleet config.
 *
 * Note: per-query `interval` is intentionally preserved — it predates the
 * RRULE feature flag and is the legacy scheduling mechanism.
 */
export const stripScheduleFieldsFromBody = <
  Body extends ScheduleInputFields & {
    queries?: Record<string, ScheduleInputFields & Record<string, unknown>>;
  } & Record<string, unknown>
>(
  body: Body
): Body => {
  const {
    schedule_type: _packType,
    interval: _packInterval,
    rrule_schedule: _packRrule,
    queries,
    ...rest
  } = body;

  const cleanedQueries = queries
    ? mapValues(queries, ({ schedule_type: _qt, rrule_schedule: _qr, ...queryRest }) => queryRest)
    : queries;

  return { ...rest, queries: cleanedQueries } as Body;
};

export interface PackScheduleExtractionResult<Queries> {
  /** Pack-level schedule attributes ready to merge into the Pack SO. */
  packSchedule: PackSchedule;
  /** Queries with schedule fields normalized for the current feature-flag state. */
  queries: Queries;
}

/**
 * Extracts pack-level scheduling fields and the queries record from a route
 * body, applying feature-flag gating and validation.
 *
 * - Feature flag OFF: all new RRULE/pack-interval fields are stripped — both
 *   pack-level and per-query overrides — preserving legacy behavior.
 * - Feature flag ON: pack-level and per-query schedule fields are validated
 *   and surfaced; the route handler is responsible for storing them on the SO.
 *
 * Returns `{ ok: false, error }` when validation fails so the route can emit
 * a 400 response with the same string.
 */
export const extractAndValidatePackScheduleFromBody = <
  QueryShape extends ScheduleInputFields & Record<string, unknown>,
  Body extends ScheduleInputFields & {
    queries?: Record<string, QueryShape>;
  } & Record<string, unknown>
>(
  body: Body,
  isRruleFeatureEnabled: boolean
):
  | { ok: true; result: PackScheduleExtractionResult<Body['queries']> }
  | { ok: false; error: string } => {
  if (!isRruleFeatureEnabled) {
    const cleaned = stripScheduleFieldsFromBody(body);

    return {
      ok: true,
      result: { packSchedule: {}, queries: cleaned.queries as Body['queries'] },
    };
  }

  const packError = validateScheduleFields('pack', body);
  if (packError) {
    return { ok: false, error: packError };
  }

  if (body.queries) {
    for (const [queryId, queryData] of Object.entries(body.queries)) {
      const queryError = validateScheduleFields('query', queryData);
      if (queryError) {
        return { ok: false, error: `Query "${queryId}": ${queryError}` };
      }
    }
  }

  return {
    ok: true,
    result: {
      packSchedule: {
        schedule_type: body.schedule_type,
        interval: body.interval,
        rrule_schedule: body.rrule_schedule,
      },
      queries: body.queries as Body['queries'],
    },
  };
};
