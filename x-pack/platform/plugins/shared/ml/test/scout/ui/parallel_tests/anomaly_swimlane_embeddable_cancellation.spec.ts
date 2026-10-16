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
  STALLING_FILTER,
  TIME_RANGE,
  viewBySwimlaneJobConfig,
} from '../fixtures/embeddable_cancellation';

// View-by applies the dashboard filter. The overall buckets request does not.
const VIEW_BY_ENDPOINT = '/internal/ml/results/view_by/influencer_values_by_time';

spaceTest.describe(
  'anomaly swim lane embedded in dashboard - request cancellation',
  { tag: tags.stateful.classic },
  () => {
    let dashboardId: string;
    let jobId: string | undefined;

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      jobId = cancellationJobId(scoutSpace.id, 'swim');
      await createOpenedAnomalyJob(apiServices, viewBySwimlaneJobConfig(jobId), scoutSpace.id);

      dashboardId = await apiServices.dashboard.create(
        {
          title: `Anomaly swim lane cancellation ${Date.now()}`,
          time_range: { ...TIME_RANGE, mode: 'absolute' },
          panels: [
            {
              type: 'ml_anomaly_swimlane',
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                job_ids: [jobId],
                swimlane_type: 'viewBy',
                view_by: 'airline',
              },
            },
          ],
          filters: [STALLING_FILTER],
        },
        scoutSpace.id
      );
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      if (jobId) {
        await deleteAnomalyJob(apiServices, jobId);
      }
    });

    spaceTest(
      'cancels in-flight searches when navigating away from the dashboard',
      async ({ page, pageObjects }) => {
        await expectHttpRequestAbortedOnNavigate(page, pageObjects, dashboardId, VIEW_BY_ENDPOINT);
      }
    );

    spaceTest(
      'cancels in-flight searches when clicking the cancel button',
      async ({ page, pageObjects }) => {
        await expectHttpRequestAbortedOnCancel(page, pageObjects, dashboardId, VIEW_BY_ENDPOINT);
      }
    );
  }
);
