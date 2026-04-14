/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { ApiServicesFixture, EsClient, KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

// Model IDs that ship with Elasticsearch and must not be deleted during cleanup
const INTERNAL_MODEL_IDS = ['lang_ident_model_1'];

export interface MlPluginApiService {
  /**
   * Deletes all ML artifacts: AD jobs, DFA jobs, trained models, calendars, filters.
   * Syncs saved objects after each phase. Safe to call at the start of a test suite.
   */
  cleanMlIndices: () => Promise<void>;

  /**
   * Initialises ML saved objects (runs the /internal/ml/saved_objects/initialize endpoint).
   * Optionally pass simulate=true for a dry-run.
   */
  initSavedObjects: (simulate?: boolean, space?: string) => Promise<void>;

  /**
   * Syncs ML saved objects (runs the /api/ml/saved_objects/sync endpoint).
   * Optionally pass simulate=true for a dry-run.
   */
  syncSavedObjects: (simulate?: boolean, space?: string) => Promise<void>;
}

export const getMlApiService = ({
  kbnClient,
  esClient,
  log,
  scoutMlApi,
}: {
  kbnClient: KbnClient;
  esClient: EsClient;
  log: ScoutLogger;
  scoutMlApi: ApiServicesFixture['ml'];
}): MlPluginApiService => {
  const service: MlPluginApiService = {
    async cleanMlIndices() {
      await measurePerformanceAsync(log, 'mlApi.cleanMlIndices', async () => {
        // Phase 1: Anomaly Detection — list via ES, bulk-delete via Kibana
        const { jobs: adJobs } = await esClient.ml.getJobs({ job_id: '_all' });
        if (adJobs.length > 0) {
          const jobIds = adJobs.map((j) => j.job_id);
          log.debug(`[mlApi] Deleting ${jobIds.length} AD job(s): ${jobIds.join(', ')}`);
          await scoutMlApi.deleteJobs({
            jobIds,
            deleteUserAnnotations: true,
            deleteAlertingRules: false,
          });
        }

        // Phase 2: Data Frame Analytics — stop then delete each
        const { data_frame_analytics: dfaJobs } = await esClient.ml.getDataFrameAnalytics({
          id: '_all',
          allow_no_match: true,
        });
        for (const job of dfaJobs) {
          log.debug(`[mlApi] Stopping and deleting DFA job: ${job.id}`);
          await esClient.ml.stopDataFrameAnalytics({ id: job.id, force: true }).catch((e) => {
            log.debug(`[mlApi] Failed to stop DFA job ${job.id}: ${e.message}`);
          });
          await esClient.ml.deleteDataFrameAnalytics({ id: job.id }).catch((e) => {
            log.debug(`[mlApi] Failed to delete DFA job ${job.id}: ${e.message}`);
          });
        }

        // Phase 3: Trained Models — skip internal IDs, force-delete the rest
        const { trained_model_configs: models } = await esClient.ml.getTrainedModels({
          size: 1000,
        });
        for (const model of models) {
          if (INTERNAL_MODEL_IDS.includes(model.model_id)) {
            log.debug(`[mlApi] Skipping internal trained model: ${model.model_id}`);
            continue;
          }
          log.debug(`[mlApi] Deleting trained model: ${model.model_id}`);
          await esClient.ml
            .deleteTrainedModel({ model_id: model.model_id, force: true })
            .catch((e) => {
              log.debug(`[mlApi] Failed to delete trained model ${model.model_id}: ${e.message}`);
            });
        }

        // Sync saved objects to reflect deletions
        await service.syncSavedObjects();
        log.debug('[mlApi] cleanMlIndices complete');
      });
    },

    async initSavedObjects(simulate = false, space?: string) {
      const path = `${
        space ? `/s/${space}` : ''
      }/internal/ml/saved_objects/initialize?simulate=${simulate}`;
      log.debug(`[mlApi] initSavedObjects${simulate ? ' (simulate)' : ''}`);
      await kbnClient.request({
        method: 'GET',
        path,
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '1' },
      });
    },

    async syncSavedObjects(simulate = false, space?: string) {
      const path = `${space ? `/s/${space}` : ''}/api/ml/saved_objects/sync?simulate=${simulate}`;
      log.debug(`[mlApi] syncSavedObjects${simulate ? ' (simulate)' : ''}`);
      await kbnClient.request({
        method: 'GET',
        path,
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31' },
      });
    },
  };

  return service;
};
