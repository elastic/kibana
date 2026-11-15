/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlApi } from '../application/services/ml_api_service';
import { getAnomalyBucketSeconds, loadAnomalyRanges } from './load_anomaly_ranges';

const HOUR_MS = 3600 * 1000;
const timeRange = { from: 0, to: 24 * HOUR_MS };

describe('getAnomalyBucketSeconds', () => {
  it('fits the buckets to the chart width', () => {
    // 24 hours over a chart with room for 100 buckets, rounded up to the 15m bucket span
    expect(getAnomalyBucketSeconds({ timeRange, chartWidth: 800, bucketSpansSeconds: [900] })).toBe(
      900
    );
  });

  it('is a multiple of the longest bucket span', () => {
    expect(
      getAnomalyBucketSeconds({ timeRange, chartWidth: 80, bucketSpansSeconds: [600, 900] })
    ).toBe(9000);
  });
});

describe('loadAnomalyRanges', () => {
  const createMlApi = (
    overallBuckets: unknown[] = [],
    jobs: unknown[] = [{ id: 'mine', bucketSpanSeconds: 900 }]
  ) =>
    ({
      jobs: { jobsSummary: jest.fn().mockResolvedValue(jobs) },
      overallBuckets: jest.fn().mockResolvedValue({ overall_buckets: overallBuckets }),
    } as unknown as jest.Mocked<MlApi>);

  it('returns no ranges, without loading scores, when there is no such job', async () => {
    const mlApi = createMlApi([], []);
    expect(await loadAnomalyRanges({ mlApi, jobId: 'mine', timeRange })).toEqual([]);
    expect(mlApi.overallBuckets).not.toHaveBeenCalled();
  });

  it('loads the scores of the job which was asked for, when the summaries are of other jobs too', async () => {
    const mlApi = createMlApi(
      [],
      [
        { id: 'first', bucketSpanSeconds: 3600 },
        { id: 'mine', bucketSpanSeconds: 900 },
        { id: 'last', bucketSpanSeconds: 7200 },
      ]
    );
    await loadAnomalyRanges({ mlApi, jobId: 'mine', timeRange });
    expect(mlApi.overallBuckets).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: ['mine'], bucketSpan: '900s' })
    );
  });

  it('returns no ranges when the summaries are only of other jobs', async () => {
    const mlApi = createMlApi([], [{ id: 'other', bucketSpanSeconds: 900 }]);
    expect(await loadAnomalyRanges({ mlApi, jobId: 'mine', timeRange })).toEqual([]);
    expect(mlApi.overallBuckets).not.toHaveBeenCalled();
  });

  it('loads the scores of the job', async () => {
    const mlApi = createMlApi();
    await loadAnomalyRanges({ mlApi, jobId: 'mine', timeRange });
    expect(mlApi.jobs.jobsSummary).toHaveBeenCalledWith(['mine']);
    expect(mlApi.overallBuckets).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: ['mine'],
        topN: 1,
        bucketSpan: '900s',
        start: 0,
        end: 24 * HOUR_MS,
      })
    );
  });

  it('converts the overall buckets to ranges', async () => {
    const mlApi = createMlApi([
      { timestamp: HOUR_MS, overall_score: 60 },
      { timestamp: 2 * HOUR_MS, overall_score: 1 },
    ]);
    const ranges = await loadAnomalyRanges({ mlApi, jobId: 'mine', timeRange });
    expect(ranges).toEqual([
      { jobId: 'mine', start: HOUR_MS, end: HOUR_MS + 900 * 1000, score: 60 },
    ]);
  });
});
