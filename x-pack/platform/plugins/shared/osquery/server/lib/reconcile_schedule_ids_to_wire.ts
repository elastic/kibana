/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get, isEqual, unset } from 'lodash';
import { produce } from 'immer-v9';
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

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
  PACK_KEY_SEPARATOR,
  removePackFromPolicy,
} from '../routes/pack/utils';
import { escapeFilterValue } from '../routes/utils/generate_copy_name';

/**
 * Resolve a pack block's space and name together, from evidence only.
 *
 * `spaceIds` is authoritative when Fleet populates it, but it is only populated
 * once space awareness is fully on — it needs `useSpaceAwareness` AND
 * `use_space_awareness_migration_status === 'success'`, and every Fleet read
 * gates it as `isSpacesEnabled ? spaceIds : undefined`. osquery, meanwhile, keys
 * pack blocks off the *Kibana* active space, which is independent of Fleet's
 * migration state. So a pre-migration policy can carry a `security--mypack`
 * block with `spaceIds: undefined`, and assuming `default` is wrong twice over:
 * the pack-SO lookup either misses (permanent non-repair) or hits a namesake
 * pack in `default` and writes `default--mypack` beside the untouched
 * `security--mypack` — `removePackFromPolicy` only unsets the canonical and bare
 * keys — leaving the agent running a DUPLICATED schedule, worse than the bug
 * this task repairs.
 *
 * The key is the only remaining evidence in that state, but it must never be
 * SPLIT: both halves can contain `--` (space ids admit `-` — the Spaces UI
 * slugifies "Prod - EU" to `prod---eu` — and pack names are unbounded), and
 * since `makePackKey` round-trips a mis-split silently overwrites the block with
 * another pack's queries. Instead the block's own `pack_name` pins the boundary
 * exactly: the space is whatever prefix makes `makePackKey(pack_name, prefix)`
 * reproduce the key — no guessing, and correct for `--` on either side. Only a
 * legacy block that predates `pack_name` has no such anchor; that case is
 * flagged `ambiguous` for the caller to resolve against real pack SOs.
 *
 * Writing through a key-derived space is safe: namespace-agnostic SOs (what a
 * pre-migration policy is) update from any scoped client, since
 * `preflightCheckNamespacesForUpdate` skips non-multi-namespace types.
 */
const resolveBlockSpaceAndName = (
  packagePolicy: PackagePolicy,
  packKey: string,
  blockPackName: string | undefined
): { spaceId: string; packName: string; ambiguous?: boolean } => {
  const declared = packagePolicy.spaceIds?.[0];
  // `ALL_SPACES_ID` collapses to the default space, mirroring Fleet's own
  // `getValidSpaceId`. Left verbatim it would scope the write client to the
  // literal space `*` and write a junk `*--name` key.
  if (declared && declared !== ALL_SPACES_ID) {
    return { spaceId: declared, packName: blockPackName ?? stripSpacePrefix(packKey, declared) };
  }

  if (blockPackName) {
    // `pack_name` pins the boundary: recover the space as the exact prefix that
    // rebuilds this key, so `--` in either half is handled without splitting.
    const suffix = `${PACK_KEY_SEPARATOR}${blockPackName}`;
    if (packKey.endsWith(suffix)) {
      const prefix = packKey.slice(0, -suffix.length);
      if (prefix.length) {
        return { spaceId: prefix, packName: blockPackName };
      }
    }

    // Bare (unprefixed) key, or a key that disagrees with `pack_name`: nothing
    // ties the block to another space, so the default space is the only guess.
    return { spaceId: DEFAULT_SPACE_ID, packName: blockPackName };
  }

  // Legacy block with no `pack_name`: nothing pins the boundary, so the split is
  // genuinely ambiguous (`prod---eu--my--pack` fits space `prod---eu`/name
  // `my--pack` as well as space `prod`/name `-eu--my--pack`). Default to the
  // whole key as a bare name in the default space — the overwhelmingly common
  // shape — but flag it so the caller can probe the alternatives against real
  // pack SOs instead of committing to a blind split.
  return {
    spaceId: DEFAULT_SPACE_ID,
    packName: packKey,
    ambiguous: packKey.includes(PACK_KEY_SEPARATOR),
  };
};

/**
 * Every (spaceId, packName) split a legacy `pack_name`-less key could mean, most
 * likely first: the whole key as a bare name in the default space, then each
 * `--` boundary read as the space/name divide. The caller keeps the first
 * candidate whose pack SO actually exists, so an ambiguous key resolves by
 * evidence rather than by picking a boundary blind.
 */
const resolveLegacyCandidates = (packKey: string): Array<{ spaceId: string; packName: string }> => {
  const candidates: Array<{ spaceId: string; packName: string }> = [
    { spaceId: DEFAULT_SPACE_ID, packName: packKey },
  ];

  for (let i = packKey.indexOf(PACK_KEY_SEPARATOR); i !== -1; ) {
    const spaceId = packKey.slice(0, i);
    const packName = packKey.slice(i + PACK_KEY_SEPARATOR.length);
    if (spaceId.length && packName.length) {
      candidates.push({ spaceId, packName });
    }

    i = packKey.indexOf(PACK_KEY_SEPARATOR, i + 1);
  }

  return candidates;
};

/**
 * Resolve a pack block's name and space from the policy and block, never by
 * splitting its `${spaceId}--${packName}` key on an arbitrary `--`: both halves
 * can contain `--` (space ids admit `-`, pack names are unbounded), and since
 * `makePackKey(parse(key))` round-trips, a mis-split silently overwrites the
 * block with another pack's queries.
 */
const resolvePackBlockIdentity = (
  packagePolicy: PackagePolicy,
  packKey: string,
  block: unknown
): { spaceId: string; packName: string; ambiguous?: boolean } => {
  const blockPackName = (block as { pack_name?: unknown } | undefined)?.pack_name;

  return resolveBlockSpaceAndName(
    packagePolicy,
    packKey,
    typeof blockPackName === 'string' && blockPackName.length ? blockPackName : undefined
  );
};

/** Strip a `${spaceId}--` prefix only for the space the block resolved to. */
const stripSpacePrefix = (packKey: string, spaceId: string): string => {
  const prefix = `${spaceId}${PACK_KEY_SEPARATOR}`;

  return packKey.startsWith(prefix) ? packKey.slice(prefix.length) : packKey;
};

/**
 * Find a pack SO by EXACT name within one space.
 *
 * `name` is mapped as analyzed `text`, so the filter matches fuzzily ("windows"
 * hits "windows discovery"). Re-check exactly or we project the wrong pack's
 * queries onto a block — and page until found, so a crowd of fuzzy matches
 * can't push the exact-named SO off the first page.
 *
 * Throws are the caller's to classify: a THROWN lookup is a transient fault,
 * whereas `undefined` means the SO genuinely is not there.
 */
const findPackSOByExactName = async (
  spaceClient: Pick<SavedObjectsClientContract, 'find'>,
  packName: string
): Promise<{ id: string; attributes: PackSavedObject } | undefined> => {
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
      return { id: so.id, attributes: so.attributes };
    }

    if (!findResult.saved_objects.length || page * perPage >= findResult.total) {
      return undefined;
    }
  }
};

/**
 * Resolve an ambiguous legacy pack key by evidence: try each candidate split in
 * its own space and keep the first one an actual pack SO backs.
 *
 * Returns `undefined` when no candidate matches, which leaves the caller's
 * default (whole key as a bare default-space name) in place so the downstream
 * lookup still warns and skips rather than writing a mis-attributed block.
 * Throws propagate — a transient ES fault must not be read as "no match".
 */
const resolveAmbiguousLegacyKey = async (
  coreStart: CoreStart,
  packKey: string
): Promise<{ spaceId: string; packName: string } | undefined> => {
  for (const candidate of resolveLegacyCandidates(packKey)) {
    const client = getInternalSavedObjectsClientForSpaceId(coreStart, candidate.spaceId);
    const so = await findPackSOByExactName(client, candidate.packName);
    if (so) {
      return candidate;
    }
  }

  return undefined;
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
        const identity = resolvePackBlockIdentity(pp, packKey, packsBlock[packKey]);
        let { spaceId, packName } = identity;

        // A legacy `pack_name`-less key on a policy with no `spaceIds` is an
        // ambiguous split, so probe the candidates and keep the one backed by a
        // real pack SO. Only reachable for that narrow class — a declared
        // `spaceIds` or a `pack_name` already pins the answer exactly.
        if (identity.ambiguous) {
          try {
            const resolved = await resolveAmbiguousLegacyKey(coreStart, packKey);
            if (resolved) {
              ({ spaceId, packName } = resolved);
            }
          } catch (err) {
            // Transient fault while probing: re-arm rather than write a block
            // built from a guessed split.
            hadFailures = true;
            logger.warn(
              `reconcileScheduleIdsToWire: failed to resolve legacy pack key "${packKey}", will retry: ${
                (err as Error).message
              }`
            );
            continue;
          }
        }

        const items = spaceWorkItems.get(spaceId) ?? [];
        items.push({ ppIndex: i, packKey, packName });
        spaceWorkItems.set(spaceId, items);
      }
    }

    if (!spaceWorkItems.size) {
      logger.debug('reconcileScheduleIdsToWire: no pack blocks found in any package policy');

      // Not hardcoded false: a legacy-key probe above may have failed
      // transiently and dropped its only work item, and that must re-arm.
      return { hadFailures };
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
          const so = await findPackSOByExactName(spaceClient, packName);
          if (so) {
            packSOsByName.set(packName, so);
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
