/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get, isEqual, unset } from 'lodash';
import { produce } from 'immer';
import type { CoreStart, Logger, SavedObjectsFindResult } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';

import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { PackSavedObject } from '../common/types';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import {
  getInternalSavedObjectsClient,
  getInternalSavedObjectsClientForSpaceId,
} from '../utils/get_internal_saved_object_client';
import {
  convertSOQueriesToPackConfig,
  policyHasPack,
  makePackKey,
  removePackFromPolicy,
} from '../routes/pack/utils';

/**
 * Idempotent, one-shot pass that pushes each enabled pack's `schedule_id`
 * values onto its Fleet package-policy wire so agents emit them in results.
 * Writes only the osquery pack block; never mints.
 */
export const reconcileScheduleIdsToWire = async ({
  coreStart,
  osqueryContext,
  logger,
  abortController,
  isRruleFeatureEnabled = false,
}: {
  coreStart: CoreStart;
  osqueryContext: OsqueryAppContextService;
  logger: Logger;
  abortController?: AbortController;
  isRruleFeatureEnabled?: boolean;
}): Promise<{ hadFailures: boolean }> => {
  const internalClient = await getInternalSavedObjectsClient(coreStart);

  // Page all packs across spaces (no 1000-pack ceiling, no offset drift).
  const packFinder = internalClient.createPointInTimeFinder<PackSavedObject>({
    type: packSavedObjectType,
    perPage: 1000,
    namespaces: ['*'],
  });
  const allPackSavedObjects: Array<SavedObjectsFindResult<PackSavedObject>> = [];
  for await (const { saved_objects: packBatch } of packFinder.find()) {
    allPackSavedObjects.push(...packBatch);
  }

  await packFinder.close();

  const packsToReconcile = allPackSavedObjects.filter(
    (pack) => pack.attributes.enabled && pack.attributes.queries?.length
  );

  if (!packsToReconcile.length) {
    logger.debug('reconcileScheduleIdsToWire: no enabled packs to reconcile');

    return { hadFailures: false };
  }

  logger.info(
    `reconcileScheduleIdsToWire: ${packsToReconcile.length} enabled pack(s) to reconcile onto the Fleet wire`
  );

  const packagePolicyService = osqueryContext.getPackagePolicyService();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  let hadFailures = false;

  if (!packagePolicyService) {
    logger.warn('reconcileScheduleIdsToWire: package policy service unavailable, will retry');

    return { hadFailures: true };
  }

  const packsBySpaceId = new Map<string, Array<SavedObjectsFindResult<PackSavedObject>>>();
  for (const packSO of packsToReconcile) {
    const spaceId = packSO.namespaces?.[0] ?? 'default';
    const spacePacks = packsBySpaceId.get(spaceId) ?? [];
    spacePacks.push(packSO);
    packsBySpaceId.set(spaceId, spacePacks);
  }

  for (const [spaceId, spacePacks] of packsBySpaceId) {
    if (abortController?.signal.aborted) {
      logger.info(
        'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
      );

      return { hadFailures: true };
    }

    const spaceClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

    // Fetch this space's osquery package policies once, regardless of how
    // many enabled packs it contains — collapses O(packs × policies) Fleet
    // list I/O to O(policies-per-space).
    const packagePolicies: PackagePolicy[] = [];
    for await (const policyBatch of await packagePolicyService.fetchAllItems(spaceClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
    })) {
      packagePolicies.push(...policyBatch);
    }

    for (const packSO of spacePacks) {
      try {
        const policyRefs =
          packSO.references
            ?.filter((r) => r.type === LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE)
            .map((r) => r.id) ?? [];

        if (!policyRefs.length) {
          continue;
        }

        const { queries: builtQueries, ...packDefaults } = convertSOQueriesToPackConfig(
          packSO.attributes.queries ?? [],
          {
            spaceId,
            packSchedule: {
              schedule_type: packSO.attributes.schedule_type,
              interval: packSO.attributes.interval,
              rrule_schedule: packSO.attributes.rrule_schedule,
            },
            isRruleFeatureEnabled,
          }
        );

        // Index-based so a successful write can be spliced back in, letting
        // later packs on the same policy diff against post-write state
        // instead of retrying a 409.
        for (let ppIndex = 0; ppIndex < packagePolicies.length; ppIndex++) {
          const pp = packagePolicies[ppIndex];
          if (policyHasPack(pp, packSO.attributes.name, spaceId)) {
            const packPath = `inputs[0].config.osquery.value.packs.${makePackKey(
              packSO.attributes.name,
              spaceId
            )}`;

            const legacyPackBlock = get(
              pp,
              `inputs[0].config.osquery.value.packs.${packSO.attributes.name}`
            ) as Record<string, unknown> | undefined;
            const existingPackBlock =
              (get(pp, packPath) as Record<string, unknown> | undefined) ?? legacyPackBlock;
            const existingShard = existingPackBlock?.shard ?? legacyPackBlock?.shard;

            // The exact block the write below re-sets, so it IS the post-write
            // state — used as the diff gate against the current wire.
            const intendedPackBlock = {
              ...(existingShard !== undefined ? { shard: existingShard } : {}),
              pack_id: packSO.id,
              ...packDefaults,
              queries: builtQueries,
            };

            if (isEqual(existingPackBlock, intendedPackBlock)) {
              logger.debug(
                `reconcileScheduleIdsToWire: pack ${packSO.id} already in sync on policy ${pp.id}, skipping write`
              );
              continue;
            }

            const updatedPolicy = await packagePolicyService.update(
              spaceClient,
              esClient,
              pp.id,
              produce<PackagePolicy>(pp, (draft) => {
                unset(draft, 'id');
                removePackFromPolicy(draft, packSO.attributes.name, spaceId);
                set(draft, packPath, intendedPackBlock);

                return draft;
              })
            );

            // Splice the updated policy back so later packs see fresh state
            // and the version bump, avoiding stale-version conflicts.
            packagePolicies[ppIndex] = { ...updatedPolicy, id: updatedPolicy.id ?? pp.id };
          }
        }

        logger.debug(
          `reconcileScheduleIdsToWire: reconciled pack ${packSO.id} in space ${spaceId}`
        );
      } catch (err) {
        const error = err as Error & {
          statusCode?: number;
          output?: { statusCode?: number };
        };
        // Fleet surfaces conflicts as Boom errors, where the HTTP status lives
        // under `output.statusCode` (no top-level `statusCode`). Read both so a
        // 409 is classified as a retryable conflict (debug) rather than a
        // generic failure (warn); either way the pass is flagged for retry.
        const statusCode = error.output?.statusCode ?? error.statusCode;
        if (statusCode === 409) {
          logger.debug(
            `reconcileScheduleIdsToWire: version conflict for pack ${packSO.id}, will retry`
          );
          hadFailures = true;
        } else {
          logger.warn(
            `reconcileScheduleIdsToWire: failed to reconcile pack ${packSO.id}: ${error.message}`
          );
          hadFailures = true;
        }
      }
    }
  }

  if (hadFailures) {
    logger.warn('reconcileScheduleIdsToWire: reconcile finished with partial failures, will retry');
  } else {
    logger.info('reconcileScheduleIdsToWire: reconcile complete');
  }

  return { hadFailures };
};
