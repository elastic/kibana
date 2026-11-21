/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, reduce } from 'lodash';
import type { DefaultValues } from 'react-hook-form';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

export type ECSMappingArray = Array<{
  key: string;
  result: {
    type: string;
    value: string | string[];
  };
}>;

export const convertECSMappingToObject = (ecsMapping: ECSMappingArray): ECSMapping =>
  reduce(
    ecsMapping,
    (acc, value) => {
      if (!isEmpty(value?.key) && !isEmpty(value.result?.type) && !isEmpty(value.result?.value)) {
        acc[value.key] = {
          [value.result.type]: value.result.value,
        };
      }

      return acc;
    },
    {} as ECSMapping
  );

export const convertECSMappingToArray = (
  ecsMapping: DefaultValues<ECSMapping> | undefined
): ECSMappingArray =>
  reduce(
    ecsMapping,
    (acc, value, key) => {
      if (value) {
        acc.push({
          key,
          result: {
            type: Object.keys(value)[0],
            value: Object.values(value as string | string[])[0],
          },
        });
      }

      return acc;
    },
    [] as ECSMappingArray
  );

export type ShardsArray = Array<{
  policy: {
    key: string;
    label: string;
  };
  percentage: number;
}>;

export type Shard = Record<string, number>;

export type ShardIntegrationGroups = Record<string, { policyIds: string[] }>;

export const convertShardsToObject = (
  shards: ShardsArray,
  groups: ShardIntegrationGroups = {}
): Shard =>
  reduce(
    shards,
    (acc, value) => {
      if (value?.policy?.key) {
        for (const policyId of groups[value.policy.key]?.policyIds ?? [value.policy.key]) {
          acc[policyId] = value.percentage;
        }
      }

      return acc;
    },
    {} as Shard
  );

const FULL_SHARD = 100;

/**
 * @param targetedPolicyIds agent policies selected without a shard. The server
 * resolves one shard per shared integration as the max over its targeted
 * members, counting a targeted member without a shard as 100%, so the group
 * row has to start from that same value. Otherwise saving the form unchanged
 * would lower the live shard.
 */
export const convertShardsToArray = (
  shards: DefaultValues<Shard>,
  policiesById?: Record<string, { name: string }>,
  groups: ShardIntegrationGroups = {},
  targetedPolicyIds: readonly string[] = []
): ShardsArray => {
  const groupIdByPolicyId = new Map(
    Object.entries(groups).flatMap(([id, { policyIds }]) =>
      policyIds.map((policyId) => [policyId, id] as const)
    )
  );
  const targeted = new Set(targetedPolicyIds);
  const rows = new Map<string, ShardsArray[number]>();
  for (const [policyId, percentage] of Object.entries(shards ?? {})) {
    if (percentage == null) {
      continue;
    }

    const key = groupIdByPolicyId.get(policyId) ?? policyId;
    const existing = rows.get(key);
    if (existing) {
      existing.percentage = Math.max(existing.percentage, percentage);
      continue;
    }

    const memberIds = groups[key]?.policyIds ?? [policyId];
    const hasTargetedMemberWithoutShard =
      key !== policyId &&
      memberIds.some((id) => targeted.has(id) && (shards as Shard | undefined)?.[id] == null);
    rows.set(key, {
      policy: {
        key,
        label: memberIds.map((id) => policiesById?.[id]?.name ?? '').join(', '),
      },
      percentage: hasTargetedMemberWithoutShard ? FULL_SHARD : percentage,
    });
  }

  return [...rows.values()];
};
