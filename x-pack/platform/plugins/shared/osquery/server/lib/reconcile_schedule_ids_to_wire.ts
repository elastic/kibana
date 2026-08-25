/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get, isEqual, unset } from 'lodash';
import { produce } from 'immer-v9';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';

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
  makePackKey,
  removePackFromPolicy,
} from '../routes/pack/utils';
import { escapeFilterValue } from '../routes/utils/generate_copy_name';

/** Pack-block keys are `${spaceId}--${packName}`, or a legacy bare `${packName}` (default space). */
const parsePackKey = (key: string): { spaceId: string; packName: string } => {
  const separatorIndex = key.indexOf('--');
  if (separatorIndex === -1) {
    return { spaceId: 'default', packName: key };
  }

  return {
    spaceId: key.slice(0, separatorIndex),
    packName: key.slice(separatorIndex + 2),
  };
};

/**
 * Idempotent, one-shot pass that pushes each pack's `schedule_id` / `start_date`
 * values onto its Fleet package-policy wire so agents emit them in results.
 *
 * Wire-first so blocks stay reachable when the pack SO has no agent-policy
 * references (attached pre-#275000, prebuilt/asset packs, 9.4→9.5 drift).
 * Writes pack block metadata only; never attaches or detaches.
 */
export const reconcileScheduleIdsToWire = async ({
  coreStart,
  osqueryContext,
  logger,
  signal,
  isRruleFeatureEnabled = false,
}: {
  coreStart: CoreStart;
  osqueryContext: OsqueryAppContextService;
  logger: Logger;
  signal?: AbortSignal;
  isRruleFeatureEnabled?: boolean;
}): Promise<{ hadFailures: boolean }> => {
  let hadFailures = false;

  // Setup I/O throwing out of run() → FailedRunResult → the one-shot task is
  // removed after maxAttempts. Convert to hadFailures so the backoff re-arms.
  try {
    const packagePolicyService = osqueryContext.getPackagePolicyService();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    if (!packagePolicyService) {
      logger.warn('reconcileScheduleIdsToWire: package policy service unavailable, will retry');

      return { hadFailures: true };
    }

    const internalClient = await getInternalSavedObjectsClient(coreStart);

    const packagePolicies: PackagePolicy[] = await fetchAllPackagePolicies(
      packagePolicyService,
      internalClient
    );

    if (!packagePolicies.length) {
      logger.debug('reconcileScheduleIdsToWire: no osquery package policies found');

      return { hadFailures: false };
    }

    // Indexed so writes can splice back updated versions (409 prevention when
    // several packs live on the same policy).
    const policiesByIndex = packagePolicies;

    const spaceWorkItems = new Map<
      string,
      Array<{ ppIndex: number; packKey: string; packName: string }>
    >();

    for (let i = 0; i < policiesByIndex.length; i++) {
      const pp = policiesByIndex[i];
      const packsBlock = get(pp, 'inputs[0].config.osquery.value.packs') as
        | Record<string, unknown>
        | undefined;
      if (!packsBlock) continue;

      for (const packKey of Object.keys(packsBlock)) {
        const { spaceId, packName } = parsePackKey(packKey);
        const items = spaceWorkItems.get(spaceId) ?? [];
        items.push({ ppIndex: i, packKey, packName });
        spaceWorkItems.set(spaceId, items);
      }
    }

    if (!spaceWorkItems.size) {
      logger.debug('reconcileScheduleIdsToWire: no pack blocks found in any package policy');

      return { hadFailures: false };
    }

    logger.info(
      `reconcileScheduleIdsToWire: scanning ${packagePolicies.length} package policy(ies) across ${spaceWorkItems.size} space(s)`
    );

    for (const [spaceId, workItems] of spaceWorkItems) {
      if (signal?.aborted) {
        logger.info(
          'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
        );

        return { hadFailures: true };
      }

      const spaceClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

      const packSOsByName = new Map<string, { id: string; attributes: PackSavedObject }>();
      const uniquePackNames = [...new Set(workItems.map((w) => w.packName))];

      for (const packName of uniquePackNames) {
        try {
          const findResult = await spaceClient.find<PackSavedObject>({
            type: packSavedObjectType,
            filter: `${packSavedObjectType}.attributes.name: "${escapeFilterValue(packName)}"`,
            perPage: 100,
          });
          // `name` is analyzed `text`, so this filter matches fuzzily ("windows"
          // hits "windows discovery"). Re-check exactly or we project the wrong
          // pack's queries onto this block.
          const so = findResult.saved_objects.find(
            (candidate) => candidate.attributes?.name === packName
          );
          if (so) {
            packSOsByName.set(packName, { id: so.id, attributes: so.attributes });
          }
        } catch (err) {
          logger.warn(
            `reconcileScheduleIdsToWire: failed to look up pack SO "${packName}" in space ${spaceId}: ${
              (err as Error).message
            }`
          );
        }
      }

      for (const { ppIndex, packKey, packName } of workItems) {
        if (signal?.aborted) {
          logger.info(
            'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
          );

          return { hadFailures: true };
        }

        const packEntry = packSOsByName.get(packName);
        if (!packEntry) {
          logger.warn(
            `reconcileScheduleIdsToWire: no pack SO found for key "${packKey}" in space ${spaceId}, skipping`
          );
          continue;
        }

        const { id: packId, attributes: packAttrs } = packEntry;
        const pp = policiesByIndex[ppIndex];
        const canonicalPackKey = makePackKey(packName, spaceId);
        const packPath = `inputs[0].config.osquery.value.packs.${canonicalPackKey}`;

        const legacyPackBlock = get(pp, `inputs[0].config.osquery.value.packs.${packName}`) as
          | Record<string, unknown>
          | undefined;
        const existingPackBlock =
          (get(pp, packPath) as Record<string, unknown> | undefined) ?? legacyPackBlock;
        const existingShard = existingPackBlock?.shard ?? legacyPackBlock?.shard;

        try {
          const { queries: builtQueries, ...packDefaults } = convertSOQueriesToPackConfig(
            packAttrs.queries ?? [],
            {
              spaceId,
              packSchedule: {
                schedule_type: packAttrs.schedule_type,
                interval: packAttrs.interval,
                rrule_schedule: packAttrs.rrule_schedule,
              },
              isRruleFeatureEnabled,
              fallbackStartDate: packAttrs.created_at,
            }
          );

          const intendedPackBlock = {
            ...(existingShard !== undefined ? { shard: existingShard } : {}),
            pack_id: packId,
            pack_name: packName,
            ...packDefaults,
            queries: builtQueries,
          };

          if (isEqual(existingPackBlock, intendedPackBlock)) {
            logger.debug(
              `reconcileScheduleIdsToWire: pack "${packKey}" already in sync on policy ${pp.id}, skipping write`
            );
            continue;
          }

          const updatedPolicy = await packagePolicyService.update(
            spaceClient,
            esClient,
            pp.id,
            produce<PackagePolicy>(pp, (draft) => {
              unset(draft, 'id');
              removePackFromPolicy(draft, packName, spaceId);
              set(draft, packPath, intendedPackBlock);

              return draft;
            })
          );

          // Splice back so later packs on this policy see the version bump (409).
          policiesByIndex[ppIndex] = { ...updatedPolicy, id: updatedPolicy.id ?? pp.id };

          logger.debug(
            `reconcileScheduleIdsToWire: repaired pack "${packKey}" on policy ${pp.id} in space ${spaceId}`
          );
        } catch (err) {
          const error = err as Error & {
            statusCode?: number;
            output?: { statusCode?: number };
          };
          const statusCode = error.output?.statusCode ?? error.statusCode;
          if (statusCode === 409) {
            logger.debug(
              `reconcileScheduleIdsToWire: version conflict for pack "${packKey}" on policy ${pp.id}, will retry`
            );
            hadFailures = true;
          } else {
            logger.warn(
              `reconcileScheduleIdsToWire: failed to repair pack "${packKey}" on policy ${pp.id}: ${error.message}`
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
