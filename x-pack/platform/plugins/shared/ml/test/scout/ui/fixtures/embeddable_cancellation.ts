/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutPage, ScoutWorkerFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

type EsClient = ScoutWorkerFixtures['esClient'];

type AnomalyJobConfig = Parameters<
  ApiServicesFixture['ml']['anomalyDetection']['createViaKibana']
>[0];

export const TIME_RANGE = {
  from: '2016-01-01T00:00:00.000Z',
  to: '2020-11-01T00:00:00.000Z',
} as const;

/**
 * Stalls searches long enough to cancel them while they are in flight.
 * `*` covers ordinary indices. `.ml-anomalies*` covers anomaly result indices.
 */
export const STALLING_FILTER = {
  type: 'dsl',
  dsl: {
    query: {
      error_query: {
        indices: [
          {
            name: '*',
            error_type: 'warning',
            message: "'Watch out!'",
            stall_time_seconds: 5,
          },
          {
            name: '.ml-anomalies*',
            error_type: 'warning',
            message: "'Watch out!'",
            stall_time_seconds: 5,
          },
        ],
      },
    },
  },
} as const;

const pendingRequest = new Promise<void>(() => {});

interface CancellationPageObjects {
  dashboard: {
    openDashboardWithId: (id: string, options: { waitForRender: boolean }) => Promise<void>;
  };
  collapsibleNav: {
    clickItem: (itemName: 'Discover') => Promise<void>;
  };
}

export function cancellationJobId(spaceId: string, label: string): string {
  const compact = spaceId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `fq_${label}_${compact || 'space'}`;
}

export function singleMetricJobConfig(jobId: string): AnomalyJobConfig {
  return {
    job_id: jobId,
    description: 'mean(responsetime) on farequote for cancellation tests',
    analysis_config: {
      bucket_span: '15m',
      influencers: [],
      detectors: [{ function: 'mean', field_name: 'responsetime' }],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '10mb' },
    model_plot_config: { enabled: true },
  };
}

export function viewBySwimlaneJobConfig(jobId: string): AnomalyJobConfig {
  return {
    job_id: jobId,
    description: 'farequote multi-metric job for swim lane cancellation tests',
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: true },
  };
}

export async function createOpenedAnomalyJob(
  apiServices: ApiServicesFixture,
  esClient: EsClient,
  job: AnomalyJobConfig,
  spaceId: string
): Promise<void> {
  const jobId = job.job_id;
  if (!jobId) {
    throw new Error('job_id is required');
  }
  await deleteAnomalyJob(esClient, jobId);
  await apiServices.ml.anomalyDetection.createViaKibana(job, spaceId);
  await apiServices.ml.anomalyDetection.openJob(jobId);
  await apiServices.ml.anomalyDetection.waitForJobState(jobId, 'opened');
}

/** Force-deletes a leftover job. The Kibana delete API gives up after 5 seconds. */
export async function deleteAnomalyJob(esClient: EsClient, jobId: string): Promise<void> {
  const datafeedId = `datafeed-${jobId}`;
  await esClient.ml.closeJob({ job_id: jobId }).catch(() => undefined);
  await esClient.ml.stopDatafeed({ datafeed_id: datafeedId, force: true }).catch(() => undefined);
  await esClient.ml.deleteDatafeed({ datafeed_id: datafeedId, force: true }).catch(() => undefined);
  await esClient.ml
    .deleteJob({ job_id: jobId, force: true, wait_for_completion: true })
    .catch((error: { statusCode?: number }) => {
      if (error.statusCode !== 404) {
        throw error;
      }
    });
}

/**
 * Keeps matching browser requests pending so a panel that does not apply dashboard
 * filters can still be cancelled while the request is in flight.
 */
export async function holdPendingRequests(page: ScoutPage, urlParts: string[]): Promise<void> {
  for (const urlPart of urlParts) {
    await page.route(`**${urlPart}**`, () => pendingRequest);
  }
}

async function openUntilRequest(
  page: ScoutPage,
  pageObjects: CancellationPageObjects,
  dashboardId: string,
  matches: (url: string, method: string) => boolean
) {
  const requestPromise = page.waitForRequest(
    (request) => matches(request.url(), request.method()),
    { timeout: 30_000 }
  );
  await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });
  return requestPromise;
}

/**
 * ML result requests are cancelled by aborting the in-flight HTTP call.
 * Staying on the dashboard distinguishes that abort from the browser dropping
 * requests during navigation.
 */
export async function expectHttpRequestAbortedOnNavigate(
  page: ScoutPage,
  pageObjects: CancellationPageObjects,
  dashboardId: string,
  urlPart: string
): Promise<void> {
  const request = await openUntilRequest(page, pageObjects, dashboardId, (url, method) => {
    return method === 'POST' && url.includes(urlPart);
  });

  await pageObjects.collapsibleNav.clickItem('Discover');
  await expect
    .poll(() => request.failure()?.errorText ?? '', { timeout: 15_000 })
    .toContain('ABORTED');
}

export async function expectHttpRequestAbortedOnCancel(
  page: ScoutPage,
  pageObjects: CancellationPageObjects,
  dashboardId: string,
  urlPart: string
): Promise<void> {
  const request = await openUntilRequest(page, pageObjects, dashboardId, (url, method) => {
    return method === 'POST' && url.includes(urlPart);
  });

  const cancelButton = page.testSubj.locator('queryCancelButton');
  await cancelButton.waitFor({ state: 'visible' });
  await cancelButton.click();

  await expect
    .poll(() => request.failure()?.errorText ?? '', { timeout: 15_000 })
    .toContain('ABORTED');
  await cancelButton.waitFor({ state: 'hidden' });
  await expect(page.testSubj.locator('embeddableError')).toBeHidden();
}
