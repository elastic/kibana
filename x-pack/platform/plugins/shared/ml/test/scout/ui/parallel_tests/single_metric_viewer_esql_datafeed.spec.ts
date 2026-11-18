/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import type { SingleMetricViewerPage } from '../fixtures/page_objects';
import { deleteAnomalyJob } from '../fixtures/embeddable_cancellation';
import {
  createAndRunJob,
  FAREQUOTE_TIME_RANGE,
  getComparableJobPairs,
  type ComparableJobPairs,
} from '../fixtures/esql_datafeed_jobs';

const TEST_CASES: ReadonlyArray<{
  readonly title: string;
  readonly pair: keyof ComparableJobPairs;
}> = [
  {
    title: 'charts a count job with an aggregated ES|QL query like the DSL job',
    pair: 'count',
  },
  { title: 'charts a mean job with a raw-row ES|QL query like the DSL job', pair: 'mean' },
  {
    title: 'charts one airline of a partitioned ES|QL job like the DSL job',
    pair: 'partitionedMean',
  },
];

// Path coordinates are rounded so float summation order in ES|QL and DSL averages cannot fail the test.
const toRoundedPoints = (path: string): number[] =>
  (path.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map((value) => Math.round(Number(value) * 10));

const readChart = async (singleMetricViewer: SingleMetricViewerPage) => ({
  focus: toRoundedPoints(await singleMetricViewer.getFocusLinePath()),
  context: toRoundedPoints(await singleMetricViewer.getContextLinePath()),
  anomalyCount: await singleMetricViewer.anomalyMarkers.count(),
});

spaceTest.describe(
  'single metric viewer - jobs with ES|QL datafeeds',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      const jobPairs = Object.values(getComparableJobPairs(scoutSpace.id));
      for (const { dslJob, dslDatafeed, esqlJob, esqlDatafeed } of jobPairs) {
        await createAndRunJob(apiServices, esClient, dslJob, dslDatafeed, scoutSpace.id);
        await createAndRunJob(apiServices, esClient, esqlJob, esqlDatafeed, scoutSpace.id);
      }
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      for (const { dslJob, esqlJob } of Object.values(getComparableJobPairs(scoutSpace.id))) {
        for (const jobId of [dslJob.job_id, esqlJob.job_id]) {
          if (jobId) {
            await deleteAnomalyJob(esClient, jobId);
          }
        }
      }
    });

    for (const { title, pair } of TEST_CASES) {
      spaceTest(title, async ({ pageObjects, scoutSpace }) => {
        const { singleMetricViewer } = pageObjects;
        const { dslJob, esqlJob, entities } = getComparableJobPairs(scoutSpace.id)[pair];

        const dslChart = await spaceTest.step('open the DSL job and read its chart', async () => {
          await singleMetricViewer.open({
            jobId: dslJob.job_id ?? '',
            ...FAREQUOTE_TIME_RANGE,
            entities,
          });
          return readChart(singleMetricViewer);
        });

        expect(dslChart.focus.length).toBeGreaterThan(0);
        expect(dslChart.anomalyCount).toBeGreaterThan(0);

        await spaceTest.step('open the ES|QL job', async () => {
          await singleMetricViewer.open({
            jobId: esqlJob.job_id ?? '',
            ...FAREQUOTE_TIME_RANGE,
            entities,
          });
        });

        await spaceTest.step('compare the ES|QL chart with the DSL chart', async () => {
          await expect(singleMetricViewer.chartDataError).toBeHidden();
          await expect
            .poll(async () => toRoundedPoints(await singleMetricViewer.getFocusLinePath()))
            .toStrictEqual(dslChart.focus);
          await expect
            .poll(async () => toRoundedPoints(await singleMetricViewer.getContextLinePath()))
            .toStrictEqual(dslChart.context);
          await expect(singleMetricViewer.anomalyMarkers).toHaveCount(dslChart.anomalyCount);
        });
      });
    }
  }
);
