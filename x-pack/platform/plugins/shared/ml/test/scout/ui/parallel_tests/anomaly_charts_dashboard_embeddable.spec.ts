/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ScoutWorkerFixtures } from '@kbn/scout';
import {
  getADFqDatafeedConfig,
  getADFqMultiMetricJobConfig,
} from '../../api/services/ml_common_configs';
import { spaceTest } from '../fixtures';

type EsClient = ScoutWorkerFixtures['esClient'];

async function deleteAnomalyJob(esClient: EsClient, jobId: string): Promise<void> {
  const datafeedId = `datafeed-${jobId}`;
  await esClient.ml.closeJob({ job_id: jobId }).catch(() => undefined);
  await esClient.ml.stopDatafeed({ datafeed_id: datafeedId, force: true }).catch(() => undefined);
  await esClient.ml.deleteDatafeed({ datafeed_id: datafeedId, force: true }).catch(() => undefined);
  await esClient.ml
    .deleteJob({ job_id: jobId, force: true, wait_for_completion: true })
    .catch(() => undefined);
}

spaceTest.describe('anomaly charts in dashboard', { tag: tags.stateful.classic }, () => {
  let jobId = '';

  spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
    jobId = `fq_charts_${scoutSpace.id.replace(/[^a-z0-9]/g, '')}`;
    await deleteAnomalyJob(esClient, jobId);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
    await scoutSpace.uiSettings.setDefaultTime({
      from: '2016-02-07T00:00:00.000Z',
      to: '2016-02-11T00:00:00.000Z',
    });

    const { data: existing } = await apiServices.dataViews.getAll(scoutSpace.id);
    if (!existing.some((dataView) => dataView.title === 'ft_farequote')) {
      await apiServices.dataViews.create({
        title: 'ft_farequote',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
    }

    await apiServices.ml.anomalyDetection.createViaKibana(
      getADFqMultiMetricJobConfig(jobId),
      scoutSpace.id
    );
    await apiServices.ml.datafeeds.create(getADFqDatafeedConfig(jobId), scoutSpace.id);
    await apiServices.ml.anomalyDetection.openJob(jobId);
    await apiServices.ml.datafeeds.start(`datafeed-${jobId}`, {
      start: '0',
      end: String(Date.now()),
    });
    await apiServices.ml.datafeeds.waitForState(`datafeed-${jobId}`, 'stopped');
    await apiServices.ml.anomalyDetection.waitForJobState(jobId, 'closed');
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    if (jobId) {
      await deleteAnomalyJob(esClient, jobId);
    }
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
  });

  spaceTest('creates an anomaly charts panel', async ({ page, pageObjects, scoutSpace }) => {
    const dashboardTitle = `ML anomaly charts ${scoutSpace.id} ${Date.now()}`;
    const panelTitle = `ML anomaly charts for ${jobId}`;

    await pageObjects.dashboard.openNewDashboard();

    await spaceTest.step('can open job selection flyout', async () => {
      await expect(page.testSubj.locator('emptyDashboardWidget')).toBeVisible();
      await pageObjects.anomalyChartsEmbeddable.openInitializer();
    });

    await spaceTest.step('can select jobs', async () => {
      await pageObjects.anomalyChartsEmbeddable.selectJob(jobId);
      expect(await pageObjects.anomalyChartsEmbeddable.selectedJobs()).toStrictEqual([jobId]);
    });

    await spaceTest.step('populates with default info', async () => {
      await expect(pageObjects.anomalyChartsEmbeddable.initializer).toBeVisible();
      await expect(pageObjects.anomalyChartsEmbeddable.maxSeriesInput).toHaveValue('6');
    });

    await spaceTest.step('create new anomaly charts panel', async () => {
      await pageObjects.anomalyChartsEmbeddable.confirm();
      await pageObjects.datePicker.pauseAutoRefresh();
      await expect(
        page.testSubj.locator(`embeddablePanelHeading-${panelTitle.replace(/\s/g, '')}`)
      ).toBeVisible();
      await expect(pageObjects.anomalyChartsEmbeddable.severityControl).toBeVisible();
      await expect(pageObjects.anomalyChartsEmbeddable.chartsContainer).toBeVisible();
      await pageObjects.dashboard.saveDashboard(dashboardTitle);
    });
  });
});
