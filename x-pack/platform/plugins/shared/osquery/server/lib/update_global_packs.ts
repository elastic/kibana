/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set';
import { has, map, mapKeys } from 'lodash';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import produce from 'immer';
import { convertShardsToObject } from '../routes/utils';
import { packSavedObjectType } from '../../common/types';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import type { PackSavedObject } from '../common/types';
import { convertSOQueriesToPackConfig, makePackKey } from '../routes/pack/utils';

/**
 * Updates an incoming package policy to embed every "global" pack (i.e. shards
 * `*`) into the agent policy's osquery input. Called from the Fleet
 * `packagePolicyCreate` callback in `plugin.ts`.
 *
 * `isRruleFeatureEnabled` flows from the plugin-scope `experimentalFeatures`
 * captured at setup, threaded through here so the wire-boundary feature-flag
 * gate (D25) applies to global packs the same way it does to user-driven
 * pack create/update routes — see proposal.md "Rollback".
 */
export const updateGlobalPacksCreateCallback = async (
  packagePolicy: NewPackagePolicy,
  packsClient: SavedObjectsClient,
  allPacks: PackSavedObject[],
  osqueryContext: OsqueryAppContextService,
  spaceId?: string,
  isRruleFeatureEnabled = false
) => {
  const agentPolicyService = osqueryContext.getAgentPolicyService();

  const agentPoliciesResult = await agentPolicyService?.getByIds(
    packsClient,
    packagePolicy.policy_ids
  );
  const agentPolicyResultIds = map(agentPoliciesResult, 'id');
  const agentPolicies = agentPoliciesResult
    ? mapKeys(await agentPolicyService?.getByIds(packsClient, agentPolicyResultIds), 'id')
    : {};

  const packsContainingShardForPolicy: PackSavedObject[] = [];
  allPacks.map((pack) => {
    const shards = convertShardsToObject(pack.shards);

    return map(shards, (shard, shardName) => {
      if (shardName === '*') {
        packsContainingShardForPolicy.push(pack);
      }
    });
  });

  if (packsContainingShardForPolicy.length) {
    await Promise.all(
      map(packsContainingShardForPolicy, (pack) =>
        packsClient.update(
          packSavedObjectType,
          pack.saved_object_id,
          {},
          {
            references: [
              ...(pack.references ?? []),
              ...packagePolicy.policy_ids.map((policyId) => ({
                id: policyId,
                name: agentPolicies[policyId]?.name,
                type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
              })),
            ],
          }
        )
      )
    );

    return produce<NewPackagePolicy>(packagePolicy, (draft) => {
      if (!has(draft, 'inputs[0].streams')) {
        set(draft, 'inputs[0].streams', []);
      }

      const resolvedSpaceId = spaceId || 'default';

      map(packsContainingShardForPolicy, (pack) => {
        const packKey = makePackKey(pack.name, resolvedSpaceId);
        // D13 wire format: pack-level schedule travels as `default_*_schedule`.
        // D25: feature-flag gating at the wire boundary.
        set(draft, `inputs[0].config.osquery.value.packs.${packKey}`, {
          shard: 100,
          pack_id: pack.saved_object_id,
          ...convertSOQueriesToPackConfig(
            pack.queries,
            resolvedSpaceId,
            {
              schedule_type: pack.schedule_type,
              interval: pack.interval,
              rrule_schedule: pack.rrule_schedule,
            },
            { isRruleFeatureEnabled }
          ),
        });
      });

      return draft;
    });
  }

  return packagePolicy;
};
