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
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { packSavedObjectType } from '../../common/types';
import type { PackSavedObject } from '../common/types';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import {
  getInternalSavedObjectsClient,
  getInternalSavedObjectsClientForSpaceId,
} from '../utils/get_internal_saved_object_client';
import {
  convertSOQueriesToPackConfig,
  fetchAllPackagePolicies,
  hasQueries,
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
  let hadFailures = false;

  // Setup I/O throwing out of run() → FailedRunResult → the one-shot task is
  // removed after maxAttempts. Convert to hadFailures so the backoff re-arms.
  try {
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
      (pack) => pack.attributes.enabled && hasQueries(pack.attributes.queries)
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

      // Fetch each space's package policies once — O(policies-per-space), not O(packs × policies).
      const packagePolicies: PackagePolicy[] = await fetchAllPackagePolicies(
        packagePolicyService,
        spaceClient
      );

      for (const packSO of spacePacks) {
        // Abort per-pack, not just per-space: the default single-space deployment
        // has one space iteration, so a space-only check would never re-fire.
        if (abortController?.signal.aborted) {
          logger.info(
            'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
          );

          return { hadFailures: true };
        }

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

          // Index-based so a written policy can be spliced back in (below), so
          // later packs on the same policy diff against post-write state.
          for (let ppIndex = 0; ppIndex < packagePolicies.length; ppIndex++) {
            // Abort down to the individual write: one pack on many policies can run long.
            if (abortController?.signal.aborted) {
              logger.info(
                'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
              );

              return { hadFailures: true };
            }

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

              // Matches the block the write sets below; used as the diff gate.
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

              // Splice back so later packs see the version bump (no stale-version 409).
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
          // Boom conflicts carry the status under output.statusCode; read both.
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
  } catch (err) {
    // Setup failed — return a retryable failure instead of throwing (see above).
    const error = err as Error;
    logger.error(
      `reconcileScheduleIdsToWire: setup failed, will retry: ${error?.message ?? String(err)}`
    );

    return { hadFailures: true };
  }

  if (hadFailures) {
    logger.warn('reconcileScheduleIdsToWire: reconcile finished with partial failures, will retry');
  } else {
    logger.info('reconcileScheduleIdsToWire: reconcile complete');
  }

  return { hadFailures };
};
