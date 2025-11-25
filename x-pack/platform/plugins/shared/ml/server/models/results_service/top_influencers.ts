/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_SWIM_LANE_HARD_LIMIT } from '../../../common/constants/explorer';
import type { MlClient } from '../../lib/ml_client';
import type {
  GetTopInfluencersRequest as GetTopInfluencersParams,
  InfluencersByFieldResponse,
} from '../../../common/types/results';

export async function getTopInfluencers(
  mlClient: MlClient,
  {
    jobIds,
    earliestMs,
    latestMs,
    influencers = [],
    influencersFilterQuery,
    maxFieldValues,
    perPage,
    page,
  }: GetTopInfluencersParams
): Promise<InfluencersByFieldResponse> {
  // Build the criteria to use in the bool filter part of the request.
  // Adds criteria for the time range plus any specified job IDs.
  const boolCriteria: any[] = [
    {
      range: {
        timestamp: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    },
    {
      range: {
        influencer_score: {
          gt: 0,
        },
      },
    },
  ];

  if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
    boolCriteria.push({
      terms: {
        job_id: jobIds,
      },
    });
  }

  if (influencersFilterQuery !== undefined) {
    boolCriteria.push(influencersFilterQuery);
  }

  // Add a should query to filter for each of the specified influencers.
  if (influencers.length > 0) {
    boolCriteria.push({
      bool: {
        should: influencers.map((inf) => ({
          bool: {
            must: [
              { term: { influencer_field_name: inf.fieldName } },
              { term: { influencer_field_value: inf.fieldValue } },
            ],
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  const maxValues =
    typeof maxFieldValues === 'number' && maxFieldValues > 0
      ? maxFieldValues
      : ANOMALY_SWIM_LANE_HARD_LIMIT;
  const pageSize = typeof perPage === 'number' && perPage > 0 ? perPage : 10;
  const pageIndex = typeof page === 'number' && page > 0 ? page : 1; // 1-based
  const from = (pageIndex - 1) * pageSize;

  const resp = await mlClient.anomalySearch(
    {
      size: 0,
      query: {
        bool: {
          filter: [
            { query_string: { query: 'result_type:influencer', analyze_wildcard: false } },
            { bool: { must: boolCriteria } },
          ],
        },
      },
      aggs: {
        influencerFieldNames: {
          terms: {
            field: 'influencer_field_name',
            size: 5,
            order: { maxAnomalyScore: 'desc' },
          },
          aggs: {
            maxAnomalyScore: { max: { field: 'influencer_score' } },
            influencerFieldValues: {
              terms: {
                field: 'influencer_field_value',
                size: maxValues,
                order: { maxAnomalyScore: 'desc' },
              },
              aggs: {
                bucketTruncate: {
                  bucket_sort: {
                    from,
                    size: pageSize,
                  },
                },
                maxAnomalyScore: { max: { field: 'influencer_score' } },
                sumAnomalyScore: { sum: { field: 'influencer_score' } },
              },
            },
          },
        },
      },
    },
    jobIds
  );

  const result: InfluencersByFieldResponse = {};
  const fieldNameBuckets = (resp.aggregations as any)?.influencerFieldNames?.buckets ?? [];

  for (const nameBucket of fieldNameBuckets) {
    const fieldName: string = nameBucket.key;
    const valueBuckets = nameBucket.influencerFieldValues?.buckets ?? [];
    result[fieldName] = valueBuckets.map((b: any) => ({
      influencerFieldValue: b.key,
      maxAnomalyScore: b.maxAnomalyScore?.value ?? 0,
      sumAnomalyScore: b.sumAnomalyScore?.value ?? 0,
    }));
  }

  return result;
}
