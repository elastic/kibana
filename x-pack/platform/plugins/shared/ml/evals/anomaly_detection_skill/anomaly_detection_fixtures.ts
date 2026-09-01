/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';

const SAMPLE_DATA_LOGS_DATASET_ID = 'logs';
const SAMPLE_DATA_LOGS_INDEX = 'kibana_sample_data_logs';
const ML_MODULE_ID = 'sample_data_weblogs';
const JOB_ID_PREFIX = 'agent-builder-eval-';
// Internal ML/Kibana routes require this header; see ELASTIC_HTTP_VERSION_HEADER in @kbn/core-http-common.
const ML_INTERNAL_HEADERS = { 'elastic-api-version': '1' } as const;

export interface AnomalyDetectionJobIds {
  responseCodeRates: string;
  lowRequestRate: string;
  urlScanning: string;
}

export interface TopAnomalyRecord {
  jobId: string;
  timestamp: string;
  responseCode: string;
  recordScore: number;
}

export interface SeededAnomalyDetectionFixtures {
  jobIds: AnomalyDetectionJobIds;
  /** Highest-scoring anomaly record found for the `responseCodeRates` job, if any were produced. */
  topAnomaly: TopAnomalyRecord | undefined;
}

interface SeedResult<T> {
  fixtures: T;
  cleanup: () => Promise<void>;
}

const jobIdsForPrefix = (): AnomalyDetectionJobIds => ({
  responseCodeRates: `${JOB_ID_PREFIX}response_code_rates`,
  lowRequestRate: `${JOB_ID_PREFIX}low_request_rate`,
  urlScanning: `${JOB_ID_PREFIX}url_scanning`,
});

const waitFor = async (
  description: string,
  conditionFn: () => Promise<boolean>,
  { timeoutMs = 5 * 60 * 1000, intervalMs = 5000 } = {}
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;

  while (true) {
    try {
      if (await conditionFn()) return;
    } catch (err) {
      lastError = err as Error;
    }
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw lastError ?? new Error(`Timed out waiting for: ${description}`);
};

/**
 * Resolves the sample-data index time range in epoch milliseconds.
 * Sample web logs shift timestamps relative to install time and can extend past "now",
 * so module setup must cover the full index range (matching the ML UI "use full index data").
 *
 * Despite the setup-module schema wording ("epoch seconds"), Elasticsearch's datafeed start
 * API interprets numeric start/end as epoch milliseconds — as does the ML UI.
 */
const getSampleDataTimeRangeMs = async (
  esClient: EsClient
): Promise<{ start: number; end: number }> => {
  const response = await esClient.search({
    index: SAMPLE_DATA_LOGS_INDEX,
    size: 0,
    aggs: {
      min_ts: { min: { field: '@timestamp' } },
      max_ts: { max: { field: '@timestamp' } },
    },
  });

  const aggs = response.aggregations as
    | { min_ts?: { value?: number | null }; max_ts?: { value?: number | null } }
    | undefined;
  const start = aggs?.min_ts?.value;
  const end = aggs?.max_ts?.value;

  if (typeof start !== 'number' || typeof end !== 'number') {
    throw new Error(
      `Could not resolve @timestamp range for ${SAMPLE_DATA_LOGS_INDEX} after sample data install`
    );
  }

  return { start: Math.floor(start), end: Math.ceil(end) };
};

const deleteEvalJobsIfPresent = async ({
  kbnClient,
  jobIds,
}: {
  kbnClient: KbnClient;
  jobIds: string[];
}): Promise<void> => {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/ml/jobs/delete_jobs',
      headers: ML_INTERNAL_HEADERS,
      body: { jobIds, deleteUserAnnotations: true },
    });
  } catch {
    // Jobs may not exist on first run; ignore.
  }
};

/**
 * Installs the "Sample web logs" dataset and sets up Elastic's built-in `sample_data_weblogs`
 * ML recognizer module against it (job_id prefixed with `${JOB_ID_PREFIX}` for isolation/cleanup).
 * The module's three jobs (`low_request_rate`, `response_code_rates`, `url_scanning`) are exactly
 * the jobs the ML UI itself would create for this dataset, so this mirrors what a real user gets
 * from "install sample data" + "create an anomaly detection job" against it.
 *
 * The datafeeds are started as a bounded historical (lookback-only) run so results are available
 * by the time this resolves, rather than a live/continuous feed.
 *
 * Once the response_code_rates datafeed finishes its lookback, the actual highest-scoring anomaly
 * record is read back and returned so grounded-output evals can assert against real, not assumed,
 * values (the sample dataset's timestamps are shifted relative to install time, so exact anomaly
 * values aren't hardcodable).
 */
export async function seedAnomalyDetectionModule({
  kbnClient,
  esClient,
  log,
}: {
  kbnClient: KbnClient;
  esClient: EsClient;
  log: ToolingLog;
}): Promise<SeedResult<SeededAnomalyDetectionFixtures> | undefined> {
  const jobIds = jobIdsForPrefix();

  try {
    await kbnClient.request({
      method: 'POST',
      path: `/api/sample_data/${SAMPLE_DATA_LOGS_DATASET_ID}`,
    });

    // Idempotent re-runs: wipe any leftover jobs from a previous failed/aborted seed.
    await deleteEvalJobsIfPresent({
      kbnClient,
      jobIds: Object.values(jobIds),
    });

    const { start, end } = await getSampleDataTimeRangeMs(esClient);

    await kbnClient.request({
      method: 'POST',
      path: `/internal/ml/modules/setup/${ML_MODULE_ID}`,
      headers: ML_INTERNAL_HEADERS,
      body: {
        prefix: JOB_ID_PREFIX,
        indexPatternName: SAMPLE_DATA_LOGS_INDEX,
        startDatafeed: true,
        // Epoch milliseconds (ES datafeed start API / ML UI convention).
        start,
        end,
        estimateModelMemory: true,
      },
    });

    // A datafeed started with an explicit `end` stops itself once it catches up to that time.
    await waitFor(
      `datafeed for '${jobIds.responseCodeRates}' to finish its lookback run`,
      async () => {
        const { datafeeds } = await esClient.ml.getDatafeedStats({
          datafeed_id: `datafeed-${jobIds.responseCodeRates}`,
        });
        if (datafeeds?.[0]?.state !== 'stopped') return false;

        const { jobs } = await esClient.ml.getJobStats({
          job_id: jobIds.responseCodeRates,
        });
        return (jobs?.[0]?.data_counts?.processed_record_count ?? 0) > 0;
      }
    );

    // `size` is only valid as a query param on GET; once sort/desc go in the body the
    // client POSTs, and Elasticsearch rejects top-level `size`. Use page.size instead.
    const { records } = await esClient.ml.getRecords({
      job_id: jobIds.responseCodeRates,
      sort: 'record_score',
      desc: true,
      page: { size: 1 },
    });

    const topRecord = records[0];
    // Keep two-decimal precision (do not Math.round): RequiredTermsInResponse does a
    // substring match, and agents typically echo the tool's raw score (e.g. 45.88).
    // Rounding to 46 would fail that check even when the answer is correct.
    const topAnomaly: TopAnomalyRecord | undefined = topRecord
      ? {
          jobId: jobIds.responseCodeRates,
          timestamp: new Date(topRecord.timestamp).toISOString(),
          responseCode: String(topRecord.partition_field_value ?? ''),
          recordScore: Number(Number(topRecord.record_score).toFixed(2)),
        }
      : undefined;

    log.info(
      `[anomaly-detection-eval] seeded jobs: ${Object.values(jobIds).join(', ')}` +
        (topAnomaly
          ? `; top anomaly: response=${topAnomaly.responseCode} score=${topAnomaly.recordScore}`
          : '; no anomaly records were produced')
    );

    return {
      fixtures: { jobIds, topAnomaly },
      cleanup: async () => {
        try {
          await kbnClient.request({
            method: 'POST',
            path: '/internal/ml/jobs/delete_jobs',
            headers: ML_INTERNAL_HEADERS,
            body: { jobIds: Object.values(jobIds), deleteUserAnnotations: true },
          });
          log.info('[anomaly-detection-eval] cleaned up seeded ML jobs');
        } catch (err) {
          log.warning(
            `[anomaly-detection-eval] cleanup failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      },
    };
  } catch (err) {
    log.warning(
      `[anomaly-detection-eval] could not seed anomaly detection module (ML may be unavailable, ` +
        `unlicensed, or sample data installation failed). Grounded evaluators will skip. Error: ${
          err instanceof Error ? err.message : String(err)
        }`
    );
    return undefined;
  }
}
