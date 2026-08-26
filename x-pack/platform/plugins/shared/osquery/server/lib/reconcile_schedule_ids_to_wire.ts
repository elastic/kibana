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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

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
  makePackKey,
  removePackFromPolicy,
} from '../routes/pack/utils';
import { escapeFilterValue } from '../routes/utils/generate_copy_name';

/**
 * Resolve a pack block's name and space from the policy and block, never by
 * parsing its `${spaceId}--${packName}` key: both halves can contain `--`
 * (space ids admit `-`, pack names are unbounded), and since
 * `makePackKey(parse(key))` round-trips, a mis-split silently overwrites the
 * block with another pack's queries.
 */
const resolvePackBlockIdentity = (
  packagePolicy: PackagePolicy,
  packKey: string,
  block: unknown
): { spaceId: string; packName: string } => {
  const blockPackName = (block as { pack_name?: unknown } | undefined)?.pack_name;
  const packName =
    typeof blockPackName === 'string' && blockPackName.length
      ? blockPackName
      : // Legacy block predating `pack_name`: the bare key IS the name.
        stripSpacePrefix(packKey, packagePolicy.spaceIds);

  return { spaceId: packagePolicy.spaceIds?.[0] ?? DEFAULT_SPACE_ID, packName };
};

/** Strip a `${spaceId}--` prefix only for a space the policy really lives in. */
const stripSpacePrefix = (packKey: string, spaceIds: string[] | undefined): string => {
  for (const spaceId of spaceIds ?? [DEFAULT_SPACE_ID]) {
    const prefix = `${spaceId}--`;
    if (packKey.startsWith(prefix)) {
      return packKey.slice(prefix.length);
    }
  }

  return packKey;
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

    // `['*']`: with Fleet space awareness enabled the internal client is scoped
    // to the default space, and a plain drain would silently skip every policy
    // (and thus every repairable pack) living in another space.
    const packagePolicies: PackagePolicy[] = await fetchAllPackagePolicies(
      packagePolicyService,
      internalClient,
      undefined,
      ['*']
    );

    if (!packagePolicies.length) {
      logger.debug('reconcileScheduleIdsToWire: no osquery package policies found');

      return { hadFailures: false };
    }

    // Indexed so writes splice back the updated policy when several packs share
    // one. Prevents a silent lost update, not a 409: Fleet strips `version` when
    // a `packagePolicyUpdate` callback is registered, and security_solution
    // always registers one — so a stale copy would overwrite, never conflict.
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
        const { spaceId, packName } = resolvePackBlockIdentity(pp, packKey, packsBlock[packKey]);
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

      // Must come from the policy's own `spaceIds`: Fleet's `update` takes no
      // spaceId and reads through the client's namespace, so a client scoped
      // elsewhere 404s before the write and re-arms this one-shot forever.
      const spaceClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

      const packSOsByName = new Map<string, { id: string; attributes: PackSavedObject }>();
      const uniquePackNames = [...new Set(workItems.map((w) => w.packName))];

      for (const packName of uniquePackNames) {
        try {
          // `name` is analyzed `text`, so this filter matches fuzzily ("windows"
          // hits "windows discovery"). Re-check exactly or we project the wrong
          // pack's queries onto this block — and page until found, so a crowd of
          // fuzzy matches can't push the exact-named SO off a single page.
          const perPage = 100;
          for (let page = 1; ; page++) {
            const findResult = await spaceClient.find<PackSavedObject>({
              type: packSavedObjectType,
              filter: `${packSavedObjectType}.attributes.name: "${escapeFilterValue(packName)}"`,
              perPage,
              page,
            });
            const so = findResult.saved_objects.find(
              (candidate) => candidate.attributes?.name === packName
            );
            if (so) {
              packSOsByName.set(packName, { id: so.id, attributes: so.attributes });
              break;
            }

            if (!findResult.saved_objects.length || page * perPage >= findResult.total) {
              break;
            }
          }
        } catch (err) {
          // A THROWN lookup is a transient fault, not an absent SO: flag it so
          // the one-shot re-arms rather than recording permanent non-repair.
          // The genuinely-absent case is the silent skip below.
          hadFailures = true;
          logger.warn(
            `reconcileScheduleIdsToWire: failed to look up pack SO "${packName}" in space ${spaceId}, will retry: ${
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

        // Nothing to anchor; rebuilding would write an empty `queries` map every
        // pass. `enabled` is deliberately NOT gated on — a disabled-but-wired
        // pack is the drift we repair in place (detaching is the routes' job).
        if (!hasQueries(packAttrs.queries)) {
          logger.debug(
            `reconcileScheduleIdsToWire: pack "${packKey}" has no queries, skipping write`
          );
          continue;
        }

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
              // Fleet's `update` doesn't strip `spaceIds` — only its callback
              // chain does. Match Fleet's own explicit-whitelist convention.
              unset(draft, 'spaceIds');
              removePackFromPolicy(draft, packName, spaceId);
              set(draft, packPath, intendedPackBlock);

              return draft;
            })
          );

          // Splice back so later packs on this policy build from the just-written
          // state rather than a stale copy (see the lost-update note above).
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
