/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get, isEqual, unset } from 'lodash';
import { produce } from 'immer';
import type { CoreStart, Logger } from '@kbn/core/server';
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
 * One-shot, idempotent reconciler that projects each enabled pack's
 * Saved-Object `schedule_id` values onto its Fleet package-policy wire, so the
 * Elastic Agent emits result documents carrying `schedule_id` (the modern
 * scheduled-history join key).
 *
 * This is NOT a backfill: minting `schedule_id` is owned by the pack SO
 * `data_backfill` model version (V4), which runs
 * deterministically on every upgrade path. By the time this reconciler runs,
 * the SO is guaranteed to carry `schedule_id` on every query. The reconciler
 * therefore reads the SO as the source of truth and never mints — making it
 * fully idempotent (no per-run uuid drift). The one thing a model version
 * structurally cannot do — write the cross-SO Fleet package policy — is the
 * only job left here.
 *
 * It writes ONLY the osquery pack block of the package policy; all other
 * policy state is preserved.
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

  const allPacks = await internalClient.find<PackSavedObject>({
    type: packSavedObjectType,
    perPage: 1000,
    namespaces: ['*'],
  });

  // Only enabled packs reach the Fleet wire. A pack whose SO carries
  // `schedule_id` values (guaranteed post-V4 for every query) is a reconcile
  // candidate; the per-policy wire-vs-SO diff gate below decides whether a
  // write is actually needed, so an already-in-sync pack is skipped.
  const packsToReconcile = allPacks.saved_objects.filter(
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

  for (const packSO of packsToReconcile) {
    if (abortController?.signal.aborted) {
      logger.info(
        'reconcileScheduleIdsToWire: aborted by task manager, will retry remaining packs'
      );

      return { hadFailures: true };
    }

    try {
      const spaceId = packSO.namespaces?.[0] ?? 'default';
      const spaceClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

      const policyRefs =
        packSO.references
          ?.filter((r) => r.type === LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE)
          .map((r) => r.id) ?? [];

      if (!policyRefs.length) {
        continue;
      }

      const { items: packagePolicies } = (await packagePolicyService.list(spaceClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      })) ?? { items: [] };

      for (const pp of packagePolicies) {
        if (policyHasPack(pp, packSO.attributes.name, spaceId)) {
          const packPath = `inputs[0].config.osquery.value.packs.${makePackKey(
            packSO.attributes.name,
            spaceId
          )}`;

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

          const intendedPackBlock = {
            pack_id: packSO.id,
            ...packDefaults,
            queries: builtQueries,
          };

          if (isEqual(get(pp, packPath), intendedPackBlock)) {
            logger.debug(
              `reconcileScheduleIdsToWire: pack ${packSO.id} already in sync on policy ${pp.id}, skipping write`
            );
            continue;
          }

          await packagePolicyService.update(
            spaceClient,
            esClient,
            pp.id,
            produce<PackagePolicy>(pp, (draft) => {
              unset(draft, 'id');
              removePackFromPolicy(draft, packSO.attributes.name, spaceId);
              set(draft, `${packPath}.pack_id`, packSO.id);
              for (const [k, v] of Object.entries(packDefaults)) {
                set(draft, `${packPath}.${k}`, v);
              }

              set(draft, `${packPath}.queries`, builtQueries);

              return draft;
            })
          );
        }
      }

      logger.debug(`reconcileScheduleIdsToWire: reconciled pack ${packSO.id} in space ${spaceId}`);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 409) {
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

  if (hadFailures) {
    logger.warn('reconcileScheduleIdsToWire: reconcile finished with partial failures, will retry');
  } else {
    logger.info('reconcileScheduleIdsToWire: reconcile complete');
  }

  return { hadFailures };
};
