/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  INTERNAL_ANALYTICS_SYNC_URL,
} from '../../../../common/constants';
import type { Owner } from '../../../../common/constants/types';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import type { CasesServerStartDependencies } from '../../../types';
import type { ConfigurationPersistedAttributes } from '../../../common/types/configure';
import {
  createCasesAnalyticsIndexesForOwnerAndSpace,
  getIndicesForOwnerAndSpace,
} from '../../../cases_analytics';
import { createAnalyticsDataViews } from '../../../cases_analytics/data_views';
import { provisionAnalyticsDashboard } from '../../../cases_analytics/dashboard';
import {
  CAISyncTypes,
  SYNCHRONIZATION_QUERIES_DICTIONARY,
  destinationIndexBySyncType,
  sourceIndexBySyncType,
} from '../../../cases_analytics/constants';

export const createTriggerAnalyticsSyncRoute = ({
  core,
  logger,
  isServerless,
}: {
  core: CoreSetup<CasesServerStartDependencies>;
  logger: Logger;
  isServerless: boolean;
}) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_ANALYTICS_SYNC_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    params: {
      body: schema.object({ owner: schema.string() }),
    },
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ context, request, response }) => {
      try {
        // Authorization check — user must have cases settings access
        const caseContext = await context.cases;
        await caseContext.getCasesClient();

        const [coreStart, pluginsStart] = await core.getStartServices();
        const owner = request.body.owner as Owner;
        const spaceId = pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        const esClient = coreStart.elasticsearch.client.asInternalUser;

        const internalRepository = coreStart.savedObjects.createInternalRepository([
          CASE_CONFIGURE_SAVED_OBJECT,
          'dashboard',
        ]);
        const soClient = new SavedObjectsClient(internalRepository);

        // Create indices if they don't exist yet (first-time enable).
        // Index creation needs task manager for the backfill task.
        const indices = getIndicesForOwnerAndSpace(spaceId, owner);
        const destIndicesExist = await esClient.indices.exists({ index: indices });
        if (!destIndicesExist) {
          const taskManager = pluginsStart.taskManager;
          if (!taskManager) {
            return response.customError({
              statusCode: 503,
              body: 'Task manager is not available for index creation',
            });
          }
          await createCasesAnalyticsIndexesForOwnerAndSpace({
            spaceId,
            owner,
            esClient,
            logger,
            isServerless,
            taskManager,
          });
        }

        // Provision dashboard (idempotent — skips if already exists).
        provisionAnalyticsDashboard(soClient, logger, spaceId).catch((dashErr) => {
          logger.warn(
            `[trigger-analytics-sync] Failed to provision analytics dashboard: ${dashErr.message}`
          );
        });

        // Create data views scoped to this space (idempotent — skips if they
        // already exist). Runs regardless of whether indices were just created
        // so that data views are always present when analytics is enabled.
        if (pluginsStart.dataViews) {
          try {
            const dvs = await pluginsStart.dataViews.dataViewsServiceFactory(
              soClient,
              esClient,
              undefined,
              true
            );
            await createAnalyticsDataViews(dvs, logger, spaceId);
          } catch (dvErr) {
            logger.warn(
              `[trigger-analytics-sync] Failed to create analytics data views: ${dvErr.message}`
            );
          }
        }

        // Read the current configure SO to determine the incremental sync window

        const configResults = await soClient.find<ConfigurationPersistedAttributes>({
          type: CASE_CONFIGURE_SAVED_OBJECT,
          namespaces: [spaceId],
          filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${owner}"`,
          perPage: 1,
        });

        // Incremental sync: only reindex documents modified since the last
        // successful sync. For a first-time sync (no timestamp) fall back to
        // epoch so all existing documents are captured.
        const lastSyncAt = configResults.saved_objects[0]?.attributes.analytics_last_sync_at
          ? new Date(configResults.saved_objects[0].attributes.analytics_last_sync_at)
          : new Date(0);

        const syncedAt = new Date();

        // Run both sync types in parallel — content and activity indices are
        // completely independent, so there is no reason to sequence them.
        await Promise.all(
          CAISyncTypes.map(async (syncType) => {
            const destIndex = destinationIndexBySyncType(syncType, spaceId, owner);
            const sourceIndex = sourceIndexBySyncType(syncType);

            const mappingResponse = await esClient.indices.getMapping({ index: destIndex });
            const painlessScriptId = mappingResponse[destIndex].mappings._meta?.painless_script_id;

            if (!painlessScriptId) {
              logger.warn(
                `[trigger-analytics-sync] No painless script ID found for ${destIndex}, skipping sync type ${syncType}`
              );
              return;
            }

            const query = SYNCHRONIZATION_QUERIES_DICTIONARY[syncType](lastSyncAt, spaceId, owner);

            await esClient.reindex({
              // Proceed past version conflicts caused by concurrent case writes
              // rather than failing the entire reindex operation.
              conflicts: 'proceed',
              source: { index: sourceIndex, query },
              dest: { index: destIndex },
              script: { id: painlessScriptId },
              refresh: true,
              // Block until the reindex is done so the HTTP response (and the
              // UI loading state) map directly to reindex completion.
              wait_for_completion: true,
            });
          })
        );

        // Write analytics_last_sync_at directly to the configure SO so the UI
        // displays the updated timestamp without waiting for the next task run.
        try {
          if (configResults.saved_objects.length > 0) {
            const so = configResults.saved_objects[0];
            await soClient.update<ConfigurationPersistedAttributes>(
              CASE_CONFIGURE_SAVED_OBJECT,
              so.id,
              { analytics_last_sync_at: syncedAt.toISOString() },
              { namespace: spaceId === 'default' ? undefined : spaceId }
            );
          }
        } catch (tsErr) {
          // Non-fatal — the data is synced; only the display timestamp failed
          logger.warn(
            `[trigger-analytics-sync] Failed to write analytics_last_sync_at: ${tsErr.message}`
          );
        }

        return response.ok({ body: { acknowledged: true, synced_at: syncedAt.toISOString() } });
      } catch (error) {
        throw createCaseError({
          message: `Failed to trigger analytics sync: ${error}`,
          error,
        });
      }
    },
  });
