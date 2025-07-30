/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, SavedObjectReference, SavedObjectsClient } from '@kbn/core/server';
import { filter, map } from 'lodash';
import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import type {
  PackagePolicy,
  PostAgentPolicyPostUpdateCallback,
} from '@kbn/fleet-plugin/server/types';

import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { getInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';

export const getAgentPolicyPostUpdateCallback =
  (core: CoreStart): PostAgentPolicyPostUpdateCallback =>
  async (updatedAgentPolicy, requestSpaceId) => {
    const hasOsqueryIntegration =
      Array.isArray(updatedAgentPolicy.package_policies) &&
      updatedAgentPolicy.package_policies.some(
        (pkg: PackagePolicy) => pkg?.package?.name === OSQUERY_INTEGRATION_NAME
      );

    if (!hasOsqueryIntegration) {
      return updatedAgentPolicy;
    }

    if (requestSpaceId) {
      if (!(updatedAgentPolicy.space_ids ?? []).includes(requestSpaceId)) {
        const spaceScopedSavedObjectClient = getInternalSavedObjectsClientForSpaceId(
          core,
          requestSpaceId
        );
        const foundPacks = await spaceScopedSavedObjectClient.find({
          type: packSavedObjectType,
          hasReference: {
            type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            id: updatedAgentPolicy.id,
          },
          perPage: 10000,
        });

        if (foundPacks.saved_objects.length) {
          const policyId = updatedAgentPolicy.id;
          await Promise.all(
            map(
              foundPacks.saved_objects,
              (pack: {
                id: string;
                references: SavedObjectReference[];
                attributes: { shards: Array<{ key: string; value: string }> };
              }) =>
                spaceScopedSavedObjectClient.update(
                  packSavedObjectType,
                  pack.id,
                  {
                    shards: filter(pack.attributes.shards, (shard) => shard.key !== policyId),
                  },
                  {
                    references: filter(pack.references, (reference) => reference.id !== policyId),
                  }
                )
            )
          );
        }
      }
    }

    return updatedAgentPolicy;
  };

export const getPackagePolicyDeleteCallback =
  (packsClient: SavedObjectsClient): PostPackagePolicyPostDeleteCallback =>
  async (deletedPackagePolicy) => {
    const deletedOsqueryManagerPolicies = filter(deletedPackagePolicy, [
      'package.name',
      OSQUERY_INTEGRATION_NAME,
    ]);
    await Promise.all(
      map(deletedOsqueryManagerPolicies, async (deletedOsqueryManagerPolicy) => {
        const policyIds = deletedOsqueryManagerPolicy.policy_ids?.length
          ? deletedOsqueryManagerPolicy.policy_ids
          : ([deletedOsqueryManagerPolicy.policy_id] as string[]);
        if (policyIds[0] !== undefined) {
          const foundPacks = await packsClient.find({
            type: packSavedObjectType,
            hasReference: policyIds.map((policyId: string) => ({
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
              id: policyId,
            })),
            perPage: 1000,
          });

          await Promise.all(
            map(
              foundPacks.saved_objects,
              (pack: {
                id: string;
                references: SavedObjectReference[];
                attributes: { shards: Array<{ key: string; value: string }> };
              }) =>
                packsClient.update(
                  packSavedObjectType,
                  pack.id,
                  {
                    shards: filter(pack.attributes.shards, (shard) =>
                      policyIds.includes(shard.key)
                    ),
                  },
                  {
                    references: filter(pack.references, (reference) =>
                      policyIds.includes(reference.id)
                    ),
                  }
                )
            )
          );
        }
      })
    );
  };
