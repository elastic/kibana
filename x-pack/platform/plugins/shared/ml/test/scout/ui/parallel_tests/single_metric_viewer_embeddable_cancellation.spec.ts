/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, spaceTest } from '@kbn/scout';
import {
  cancellationJobId,
  createOpenedAnomalyJob,
  deleteAnomalyJob,
  expectHttpRequestAbortedOnCancel,
  expectHttpRequestAbortedOnNavigate,
  holdPendingRequests,
  singleMetricJobConfig,
  TIME_RANGE,
} from '../fixtures/embeddable_cancellation';

// The viewer searches anomaly results and does not apply dashboard filters, so the
// request is held in the browser until the panel aborts it.
const ANOMALY_SEARCH_ENDPOINT = '/internal/ml/results/anomaly_search';

spaceTest.describe(
  'single metric viewer embedded in dashboard - request cancellation',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId: string;
    let jobId: string | undefined;

    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      jobId = cancellationJobId(scoutSpace.id, 'smv');
      await createOpenedAnomalyJob(
        apiServices,
        esClient,
        singleMetricJobConfig(jobId),
        scoutSpace.id
      );

      dashboardId = await apiServices.dashboard.create(
        {
          title: `Single metric viewer cancellation ${Date.now()}`,
          time_range: { ...TIME_RANGE, mode: 'absolute' },
          panels: [
            {
              type: 'ml_single_metric_viewer',
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                job_ids: [jobId],
                selected_detector_index: 0,
              },
            },
          ],
        },
        scoutSpace.id
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await holdPendingRequests(page, [ANOMALY_SEARCH_ENDPOINT, '/internal/ml/es_search']);
    });

    spaceTest.afterAll(async ({ esClient }) => {
      if (jobId) {
        await deleteAnomalyJob(esClient, jobId);
      }
    });

    spaceTest(
      'cancels in-flight searches when navigating away from the dashboard',
      async ({ page, pageObjects }) => {
        await expectHttpRequestAbortedOnNavigate(
          page,
          pageObjects,
          dashboardId,
          ANOMALY_SEARCH_ENDPOINT
        );
      }
    );

    spaceTest(
      'cancels in-flight searches when clicking the cancel button',
      async ({ page, pageObjects }) => {
        await expectHttpRequestAbortedOnCancel(
          page,
          pageObjects,
          dashboardId,
          ANOMALY_SEARCH_ENDPOINT
        );
      }
    );
  }
);
