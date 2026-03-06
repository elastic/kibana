/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import { set } from '@kbn/safer-lodash-set';
import { unset } from 'lodash';
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
import { convertSOQueriesToPackConfig, policyHasPack, makePackKey } from '../routes/pack/utils';

/**
 * One-time migration that assigns stable `schedule_id` + `start_date` to every
 * pack query that doesn't already have them. The task marks itself as completed
 * after the first successful run; subsequent executions are no-ops.
 */
export const backfillScheduleIds = async ({
  coreStart,
  osqueryContext,
  logger,
}: {
  coreStart: CoreStart;
  osqueryContext: OsqueryAppContextService;
  logger: Logger;
}): Promise<void> => {
  const internalClient = await getInternalSavedObjectsClient(coreStart);

  const allPacks = await internalClient.find<PackSavedObject>({
    type: packSavedObjectType,
    perPage: 1000,
    namespaces: ['*'],
  });

  const packsToBackfill = allPacks.saved_objects.filter((pack) =>
    pack.attributes.queries?.some((q) => !q.schedule_id)
  );

  if (!packsToBackfill.length) {
    logger.debug('backfillScheduleIds: all packs already have schedule_id values');

    return;
  }

  logger.info(`backfillScheduleIds: ${packsToBackfill.length} pack(s) need schedule_id backfill`);

  const packagePolicyService = osqueryContext.getPackagePolicyService();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const now = moment().toISOString();

  for (const packSO of packsToBackfill) {
    try {
      const spaceId = packSO.namespaces?.[0] ?? 'default';
      const spaceClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

      const updatedQueries = (packSO.attributes.queries ?? []).map((q) => ({
        ...q,
        schedule_id: q.schedule_id ?? uuidv4(),
        start_date: q.start_date ?? now,
      }));

      await spaceClient.update(packSavedObjectType, packSO.id, {
        queries: updatedQueries,
      });

      if (packSO.attributes.enabled && packagePolicyService) {
        const policyRefs =
          packSO.references
            ?.filter((r) => r.type === LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE)
            .map((r) => r.id) ?? [];

        if (policyRefs.length) {
          const { items: packagePolicies } = (await packagePolicyService.list(spaceClient, {
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
            perPage: 1000,
            page: 1,
          })) ?? { items: [] };

          for (const pp of packagePolicies) {
            if (policyHasPack(pp, packSO.attributes.name, spaceId)) {
              await packagePolicyService.update(
                spaceClient,
                esClient,
                pp.id,
                produce<PackagePolicy>(pp, (draft) => {
                  unset(draft, 'id');
                  set(
                    draft,
                    `inputs[0].config.osquery.value.packs.${makePackKey(
                      packSO.attributes.name,
                      spaceId
                    )}.queries`,
                    convertSOQueriesToPackConfig(updatedQueries, spaceId, packSO.id)
                  );

                  return draft;
                })
              );
            }
          }
        }
      }

      logger.debug(`backfillScheduleIds: backfilled pack ${packSO.id} in space ${spaceId}`);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 409) {
        logger.debug(`backfillScheduleIds: version conflict for pack ${packSO.id}, skipping`);
      } else {
        logger.warn(`backfillScheduleIds: failed to backfill pack ${packSO.id}: ${error.message}`);
      }
    }
  }

  logger.info('backfillScheduleIds: backfill complete');
};
