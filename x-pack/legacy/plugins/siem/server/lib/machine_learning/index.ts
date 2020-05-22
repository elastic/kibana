/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

import { AlertServices } from '../../../../../../plugins/alerting/server';
import { AnomalyRecordDoc as Anomaly } from '../../../../../../plugins/ml/common/types/anomalies';

export { Anomaly };
export type AnomalyResults = SearchResponse<Anomaly>;

export interface AnomaliesSearchParams {
  jobIds: string[];
  threshold: number;
  earliestMs: number;
  latestMs: number;
  maxRecords?: number;
}

export const getAnomalies = async (
  params: AnomaliesSearchParams,
  callCluster: AlertServices['callCluster']
): Promise<AnomalyResults> => {
  const boolCriteria = buildCriteria(params);

  return callCluster('search', {
    index: '.ml-anomalies-*',
    size: params.maxRecords || 100,
    body: {
      query: {
        bool: {
          filter: [
            {
              query_string: {
                query: 'result_type:record',
                analyze_wildcard: false,
              },
            },
            {
              bool: {
                must: boolCriteria,
              },
            },
          ],
        },
      },
      sort: [{ record_score: { order: 'desc' } }],
    },
  });
};

const buildCriteria = (params: AnomaliesSearchParams): object[] => {
  const { earliestMs, jobIds, latestMs, threshold } = params;
  const jobIdsFilterable = jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*');

  const boolCriteria: object[] = [
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
        record_score: {
          gte: threshold,
        },
      },
    },
  ];

  if (jobIdsFilterable) {
    const jobIdFilter = jobIds.map((jobId) => `job_id:${jobId}`).join(' OR ');

    boolCriteria.push({
      query_string: {
        analyze_wildcard: false,
        query: jobIdFilter,
      },
    });
  }

  return boolCriteria;
};
