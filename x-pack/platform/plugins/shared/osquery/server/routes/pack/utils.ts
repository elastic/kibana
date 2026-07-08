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
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { Shard } from '../../../common/utils/converters';
import { DEFAULT_PLATFORM } from '../../../common/constants';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

// V3 backfill's start_date fallback when a pack SO lacks `created_at`.
// The wire builder suppresses this sentinel from query output.
export const START_DATE_EPOCH_FALLBACK = '1970-01-01T00:00:00.000Z';

export interface PackQueryInput {
  /**
   * The query's existing stored `id`, optionally sent on an update body so a
   * rename edit (changed map key) can still resolve the original query and
   * preserve its `schedule_id`. Not used on create (id derives from the key).
   */
  id?: string;
  name?: string;
  query: string;
  interval: number;
  platform?: string;
  version?: string;
  snapshot?: boolean;
  removed?: boolean;
  timeout?: number;
  schedule_id?: string;
  start_date?: string;
  ecs_mapping?: Record<string, unknown>;
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
      acc.push({
        id: key,
        ...pick(value, [
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
        ]),
        ...(ecsMapping ? { ecs_mapping: ecsMapping } : {}),
      } as SOPackQuery);

      return acc;
    },
    []
  );

// Single source of truth for the stored-query key: id when present, else array index.
// The `query.id` truthiness check intentionally treats an empty-string id as
// ABSENT (a malformed '' id must fall back to the index/key, not be honored).
// FROZEN once the schedule_id backfill has shipped: feeds the deterministic
// schedule_id UUIDv5, so a change here silently changes migration output.
export const deriveEffectiveQueryKey = (
  query: { id?: string },
  indexOrKey: string | number
): string => (query.id ? query.id : String(indexOrKey));

// Shape-agnostic emptiness check for a pack's `queries` (array or record).
// Shared by the backfill mint guard and the reconcile filter so they can't drift.
// Typed as a guard so a truthy result narrows away null/undefined.
export const hasQueries = <T extends unknown[] | Record<string, unknown>>(
  queries: T | null | undefined
): queries is T =>
  Array.isArray(queries) ? queries.length > 0 : Object.keys(queries ?? {}).length > 0;

export const convertSOQueriesToPack = (queries: SOPackQuery[] | Record<string, PackQueryInput>) =>
  reduce(
    queries as Record<string, SOPackQuery>,
    (
      acc: Record<string, PackQueryInput>,
      { id: queryId, ecs_mapping, query, platform, ...rest }: SOPackQuery,
      key: string
    ) => {
      const index = deriveEffectiveQueryKey({ id: queryId }, key);
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

/** Per-query fields preserved across an edit-save (keyed by stored query id). */
export interface PreservableQueryFields {
  schedule_id?: string;
  start_date?: string;
}

// Resolves which stored query each outgoing query preserves schedule_id
// from; a stored row is claimed at most once so two queries can't collapse
// onto one join key.
export const resolvePreservedQueries = (
  outgoingQueries: Record<string, Partial<PackQueryInput>>,
  existingQueriesById: Record<string, PreservableQueryFields>
): Record<string, PreservableQueryFields> => {
  const consumedExistingIds = new Set<string>();

  const claim = (
    acc: Record<string, PreservableQueryFields>,
    queryKey: string,
    existingId: string | undefined
  ) => {
    if (existingId && !consumedExistingIds.has(existingId) && existingQueriesById[existingId]) {
      consumedExistingIds.add(existingId);
      acc[queryKey] = existingQueriesById[existingId];
    }

    return acc;
  };

  // Pass 1: queries matching by the client-supplied `id` (explicit rename intent).
  // Insertion order is the tie-break: the first claimant of a stored row wins,
  // and `claim` consumes each stored row at most once, so a crafted/duplicate
  // `id` cannot make two queries collapse onto the same schedule_id.
  const byId = Object.entries(outgoingQueries).reduce<Record<string, PreservableQueryFields>>(
    (acc, [queryKey, queryData]) => claim(acc, queryKey, queryData.id),
    {}
  );

  // Pass 2: remaining queries matched by their own map key.
  return Object.keys(outgoingQueries)
    .filter((queryKey) => !byId[queryKey])
    .reduce<Record<string, PreservableQueryFields>>(
      (acc, queryKey) => claim(acc, queryKey, queryKey),
      byId
    );
};

// Builds the Fleet packs.{key}.queries config. `schedule_id`/`start_date`
// pass through via `...rest`; the epoch-fallback sentinel is suppressed so an
// interval pack that never had a `start_date` doesn't emit a bogus 1970 one.
export const convertSOQueriesToPackConfig = (
  queries: SOPackQuery[] | Record<string, PackQueryInput>,
  spaceId?: string
) =>
  reduce(
    queries as SOPackQuery[],
    (
      acc: Record<string, Record<string, unknown>>,
      {
        id: queryId,
        ecs_mapping,
        query,
        platform,
        removed,
        snapshot,
        start_date,
        ...rest
      }: SOPackQuery,
      key: number
    ) => {
      const resultType = snapshot === false ? { removed, snapshot } : {};
      const index = deriveEffectiveQueryKey({ id: queryId }, key);
      acc[index] = {
        ...rest,
        ...(start_date !== undefined && start_date !== START_DATE_EPOCH_FALLBACK
          ? { start_date }
          : {}),
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

/**
 * Drain ALL osquery package policies via keyset `fetchAllItems`. Shared by the
 * create/delete/update routes and the reconciler; replaces the offset-capped
 * `list({ perPage: 1000 })` that silently dropped policies past the first 1000.
 */
export const fetchAllPackagePolicies = async (
  packagePolicyService: PackagePolicyClient | undefined,
  soClient: SavedObjectsClientContract,
  kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`
): Promise<PackagePolicy[]> => {
  const packagePolicies: PackagePolicy[] = [];
  if (!packagePolicyService) {
    return packagePolicies;
  }

  for await (const policyBatch of await packagePolicyService.fetchAllItems(soClient, { kuery })) {
    packagePolicies.push(...policyBatch);
  }

  return packagePolicies;
};

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
