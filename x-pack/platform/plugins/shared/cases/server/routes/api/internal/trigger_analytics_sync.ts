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
      body: schema.object({
        owner: schema.oneOf([
          schema.literal('cases'),
          schema.literal('observability'),
          schema.literal('securitySolution'),
        ]),
      }),
    },
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ context, request, response }) => {
      try {
        // Step 1: Verify the user has configure-level access for this specific
        // owner.  configure.get() applies the owner-scoped authorization filter;
        // if the returned list is empty the user has no access to this owner
        // (cross-owner attempt) or no configuration has been created yet.
        // We return 404 in either case — returning 403 for the no-SO case
        // would be misleading since getAuthorizationFilter throws (not returns [])
        // when the user has no access to any owner at all.
        const caseContext = await context.cases;
        const casesClient = await caseContext.getCasesClient();
        const owner = request.body.owner;
        logger.info(`[trigger-analytics-sync] Manual sync triggered for owner: ${owner}`);
        const authorizedConfigs = await casesClient.configure.get({ owner: [owner] });
        if (authorizedConfigs.length === 0) {
          return response.notFound({
            body: `No Cases configuration found for owner: ${owner}. Enable analytics in Cases > Configure first.`,
          });
        }

        // Step 1b: Verify the user has settings-level (write) access, not just read
        // access. configure.get() only checks read privileges; triggering a sync is
        // equivalent to an updateConfiguration operation and requires Cases:all.
        await casesClient.configure.ensureUpdateAuthorized(owner, authorizedConfigs[0].id);

        // Step 2: Verify analytics is enabled for this space/owner BEFORE
        // running any infrastructure side-effects (index creation, dashboard,
        // data views).  Use the already-fetched configure.get() result to avoid
        // a redundant saved-object round-trip.
        if (authorizedConfigs[0].analytics_enabled !== true) {
          return response.badRequest({
            body: 'Analytics is not enabled for this space and owner.',
          });
        }

        // All guards passed — now acquire start services for the expensive operations.
        const [coreStart, pluginsStart] = await core.getStartServices();
        const spaceId = pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        const esClient = coreStart.elasticsearch.client.asInternalUser;

        const internalRepository = coreStart.savedObjects.createInternalRepository([
          CASE_CONFIGURE_SAVED_OBJECT,
          'dashboard',
        ]);
        const soClient = new SavedObjectsClient(internalRepository);

        // Step 3: Infrastructure setup — idempotent, only runs if needed.
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
        provisionAnalyticsDashboard(soClient, logger, spaceId).catch((dashErr: Error) => {
          logger.warn(
            `[trigger-analytics-sync] Failed to provision analytics dashboard: ${dashErr.message}`,
            { error: dashErr, owner, spaceId }
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
              `[trigger-analytics-sync] Failed to create analytics data views: ${dvErr.message}`,
              { error: dvErr, owner, spaceId }
            );
          }
        }

        // Record the sync start time before launching the reindexes so that
        // the UI immediately reflects an updated timestamp on success.
        const syncedAt = new Date();
        const startTimeMs = syncedAt.getTime();

        // Optimistically write the sync timestamp and mark status active BEFORE
        // the reindex tasks complete. This avoids blocking the HTTP response
        // on long-running reindexes (proxy timeouts are typically 60 s, far
        // shorter than the potential reindex duration).  The OwnerSyncTask
        // (running every 5 min) will overwrite with the authoritative timestamp
        // once each reindex actually finishes.
        soClient
          .update<ConfigurationPersistedAttributes>(
            CASE_CONFIGURE_SAVED_OBJECT,
            authorizedConfigs[0].id,
            { analytics_last_sync_at: syncedAt.toISOString(), analytics_sync_status: 'active' },
            { namespace: spaceId === 'default' ? undefined : spaceId }
          )
          .catch((tsErr: Error) => {
            // Non-fatal — the data will be synced; only the display timestamp failed.
            logger.warn(
              `[trigger-analytics-sync] Failed to write analytics_last_sync_at: ${tsErr.message}`,
              { error: tsErr, owner, spaceId }
            );
          });

        // Incremental sync: only reindex documents modified since the last
        // successful sync. For a first-time sync (no timestamp) fall back to
        // epoch so all existing documents are captured.
        const lastSyncAt = authorizedConfigs[0].analytics_last_sync_at
          ? new Date(authorizedConfigs[0].analytics_last_sync_at)
          : new Date(0);

        // Start both reindex tasks in parallel — content and activity indices are
        // completely independent.  Use async reindex (wait_for_completion: false)
        // and return immediately; the OwnerSyncTask (5-min schedule) will pick up
        // completed tasks and update analytics_last_sync_at with the authoritative
        // finish time.  We do NOT poll here because HTTP proxies typically enforce
        // a 60-second read timeout, which is far shorter than a large reindex.
        const taskIds = await Promise.all(
          CAISyncTypes.map(async (syncType) => {
            const destIndex = destinationIndexBySyncType(syncType, spaceId, owner);
            const sourceIndex = sourceIndexBySyncType(syncType);

            const mappingResponse = await esClient.indices.getMapping({ index: destIndex });
            const painlessScriptId = mappingResponse[destIndex].mappings._meta?.painless_script_id;

            if (!painlessScriptId) {
              logger.warn(
                `[trigger-analytics-sync] No painless script ID found for ${destIndex}, skipping sync type ${syncType}`
              );
              return null;
            }

            const query = SYNCHRONIZATION_QUERIES_DICTIONARY[syncType](lastSyncAt, spaceId, owner);

            const reindexResponse = await esClient.reindex({
              // Proceed past version conflicts caused by concurrent case writes
              // rather than failing the entire reindex operation.
              conflicts: 'proceed',
              source: { index: sourceIndex, query },
              dest: { index: destIndex },
              script: { id: painlessScriptId },
              refresh: true,
              wait_for_completion: false,
            });

            return String(reindexResponse.task);
          })
        );

        logger.info(
          `[trigger-analytics-sync] Reindex tasks started for owner: ${owner} in space: ${spaceId} task_ids=[${taskIds.filter(Boolean).join(',')}] (${Date.now() - startTimeMs}ms)`
        );

        return response.ok({
          body: {
            acknowledged: true,
            synced_at: syncedAt.toISOString(),
            task_ids: taskIds.filter(Boolean),
          },
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to trigger analytics sync: ${error}`,
          error,
        });
      }
    },
  });
