/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_SWIM_LANE_HARD_LIMIT } from '../../../common/constants/explorer';
import type { MlClient } from '../../lib/ml_client';

export interface GetScoresByBucketRequest {
  jobIds: string[];
  earliestMs: number;
  latestMs: number;
  intervalMs: number;
  perPage?: number;
  fromPage?: number;
  swimLaneSeverity?: Array<{ min: number; max?: number }>;
}

export interface GetInfluencerValueMaxScoreByTimeRequest {
  jobIds: string[];
  influencerFieldName: string;
  influencerFieldValues?: string[];
  earliestMs: number;
  latestMs: number;
  intervalMs: number;
  maxResults?: number;
  perPage?: number;
  fromPage?: number;
  influencersFilterQuery?: unknown;
  swimLaneSeverity?: Array<{ min: number; max?: number }>;
}

export async function getScoresByBucket(
  mlClient: MlClient,
  {
    jobIds,
    earliestMs,
    latestMs,
    intervalMs,
    perPage = 10,
    fromPage = 1,
    swimLaneSeverity = [{ min: 0 }],
  }: GetScoresByBucketRequest
) {
  const boolCriteria: any[] = [
    { range: { timestamp: { gte: earliestMs, lte: latestMs, format: 'epoch_millis' } } },
  ];

  const thresholdCriteria = swimLaneSeverity.map((t) => ({
    range: { anomaly_score: { gte: t.min, ...(t.max !== undefined ? { lte: t.max } : {}) } },
  }));
  boolCriteria.push({ bool: { should: thresholdCriteria, minimum_should_match: 1 } });

  if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
    const query = jobIds.map((j) => `job_id:${j}`).join(' OR ');
    boolCriteria.push({ query_string: { analyze_wildcard: false, query } });
  }

  const resp = await mlClient.anomalySearch(
    {
      size: 0,
      query: {
        bool: {
          filter: [
            { query_string: { query: 'result_type:bucket', analyze_wildcard: false } },
            { bool: { must: boolCriteria } },
          ],
        },
      },
      aggs: {
        jobsCardinality: { cardinality: { field: 'job_id' } },
        jobId: {
          terms: {
            field: 'job_id',
            size: jobIds?.length ?? 1,
            order: { anomalyScore: 'desc' },
          },
          aggs: {
            anomalyScore: { max: { field: 'anomaly_score' } },
            bucketTruncate: {
              bucket_sort: { from: (fromPage - 1) * perPage, size: perPage === 0 ? 1 : perPage },
            },
            byTime: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: `${intervalMs}ms`,
                min_doc_count: 1,
                extended_bounds: { min: earliestMs, max: latestMs },
              },
              aggs: { anomalyScore: { max: { field: 'anomaly_score' } } },
            },
          },
        },
      },
    },
    jobIds
  );

  const results: Record<string, Record<number, number>> = {};
  const buckets = (resp.aggregations as any)?.jobId?.buckets ?? [];
  for (const jobBucket of buckets) {
    const jobId = jobBucket.key as string;
    const byTime = jobBucket.byTime?.buckets ?? [];
    const resultForTime: Record<number, number> = {};
    for (const t of byTime) {
      const value = t.anomalyScore?.value;
      if (value !== undefined) {
        resultForTime[t.key] = value;
      }
    }
    results[jobId] = resultForTime;
  }

  const cardinality = (resp.aggregations as any)?.jobsCardinality?.value ?? 0;
  return { results, cardinality };
}

export async function getInfluencerValueMaxScoreByTime(
  mlClient: MlClient,
  {
    jobIds,
    influencerFieldName,
    influencerFieldValues = [],
    earliestMs,
    latestMs,
    intervalMs,
    maxResults,
    perPage = 10,
    fromPage = 1,
    influencersFilterQuery,
    swimLaneSeverity = [{ min: 0 }],
  }: GetInfluencerValueMaxScoreByTimeRequest
) {
  const boolCriteria: any[] = [
    { range: { timestamp: { gte: earliestMs, lte: latestMs, format: 'epoch_millis' } } },
  ];

  const thresholdCriteria = swimLaneSeverity.map((t) => ({
    range: { influencer_score: { gte: t.min, ...(t.max !== undefined ? { lte: t.max } : {}) } },
  }));
  boolCriteria.push({ bool: { should: thresholdCriteria, minimum_should_match: 1 } });

  if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
    const query = jobIds.map((j) => `job_id:${j}`).join(' OR ');
    boolCriteria.push({ query_string: { analyze_wildcard: false, query } });
  }

  if (influencersFilterQuery !== undefined) {
    boolCriteria.push(influencersFilterQuery);
  }

  if (influencerFieldValues.length > 0) {
    boolCriteria.push({
      bool: {
        should: influencerFieldValues.map((v) => ({ term: { influencer_field_value: v } })),
        minimum_should_match: 1,
      },
    });
  }

  const resp = await mlClient.anomalySearch(
    {
      size: 0,
      query: {
        bool: {
          filter: [
            { query_string: { query: 'result_type:influencer', analyze_wildcard: false } },
            { term: { influencer_field_name: influencerFieldName } },
            { bool: { must: boolCriteria } },
          ],
        },
      },
      aggs: {
        influencerValuesCardinality: { cardinality: { field: 'influencer_field_value' } },
        influencerFieldValues: {
          terms: {
            field: 'influencer_field_value',
            size: !!maxResults ? maxResults : ANOMALY_SWIM_LANE_HARD_LIMIT,
            order: { maxAnomalyScore: 'desc' },
          },
          aggs: {
            maxAnomalyScore: { max: { field: 'influencer_score' } },
            bucketTruncate: { bucket_sort: { from: (fromPage - 1) * perPage, size: perPage } },
            byTime: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: `${intervalMs}ms`,
                min_doc_count: 1,
              },
              aggs: { maxAnomalyScore: { max: { field: 'influencer_score' } } },
            },
          },
        },
      },
    },
    jobIds
  );

  const results: Record<string, Record<number, number>> = {};
  const valueBuckets = (resp.aggregations as any)?.influencerFieldValues?.buckets ?? [];
  for (const valueBucket of valueBuckets) {
    const fieldValue = valueBucket.key as string;
    const fieldValues: Record<number, number> = {};
    const timeBuckets = valueBucket.byTime?.buckets ?? [];
    for (const t of timeBuckets) {
      fieldValues[t.key] = t.maxAnomalyScore?.value ?? 0;
    }
    results[fieldValue] = fieldValues;
  }

  const cardinality = (resp.aggregations as any)?.influencerValuesCardinality?.value ?? 0;
  return { results, cardinality };
}
