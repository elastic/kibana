/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';
import { SearchResponse } from 'elasticsearch';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { buildAnomalyTableItems } from '../../../../../../plugins/ml/server/models/results_service/build_anomaly_table_items';
import { CriteriaFields, InfluencerInput, Anomalies } from '../../../public/components/ml/types';
import { AlertServices } from '../../../../../../plugins/alerting/server';

export interface AnomaliesSearchParams {
  jobIds: string[];
  threshold: number;
  earliestMs: number;
  latestMs: number;
  maxRecords?: number;
}

export const anomaliesTableData = async (
  params: AnomaliesSearchParams,
  callCluster: AlertServices['callCluster']
): Promise<Anomalies> => {
  const boolCriteria = buildCriteria(params);

  const anomalies: SearchResponse<any> = await callCluster('search', {
    index: '.ml-anomalies-*',
    rest_total_hits_as_int: true,
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

  return aggregate(anomalies);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildCriteria = (params: AnomaliesSearchParams): any => {
  const { earliestMs, jobIds, latestMs, threshold } = params;
  const jobIdsFilterable =
    jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*');

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
    const jobIdFilter = jobIds.map(jobId => `job_id:${jobId}`).join(' OR ');

    boolCriteria.push({
      query_string: {
        analyze_wildcard: false,
        query: jobIdFilter,
      },
    });
  }

  return boolCriteria;
};

const aggregate = (anomalies: SearchResponse<any>): Anomalies => {
  const aggregationInterval = 'auto';
  const tableData: {
    anomalies: AnomaliesTableRecord[];
    interval: string;
    examplesByJobId?: { [key: string]: any };
  } = {
    anomalies: [],
    interval: 'second',
  };
  if (anomalies.hits.total !== 0) {
    let records: AnomalyRecordDoc[] = [];
    anomalies.hits.hits.forEach(hit => {
      records.push(hit._source);
    });

    // Sort anomalies in ascending time order.
    records = _.sortBy(records, 'timestamp');
    tableData.interval = aggregationInterval;
    if (aggregationInterval === 'auto') {
      // Determine the actual interval to use if aggregating.
      const earliest = moment(records[0].timestamp);
      const latest = moment(records[records.length - 1].timestamp);

      const daysDiff = latest.diff(earliest, 'days');
      tableData.interval = daysDiff < 2 ? 'hour' : 'day';
    }

    tableData.anomalies = buildAnomalyTableItems(records, tableData.interval, 'America/Chicago');

    // Load examples for any categorization anomalies.
    const categoryAnomalies = tableData.anomalies.filter(
      (item: any) => item.entityName === 'mlcategory'
    );
    if (categoryAnomalies.length > 0) {
      tableData.examplesByJobId = {};

      const categoryIdsByJobId: { [key: string]: any } = {};
      categoryAnomalies.forEach(anomaly => {
        if (!_.has(categoryIdsByJobId, anomaly.jobId)) {
          categoryIdsByJobId[anomaly.jobId] = [];
        }
        if (categoryIdsByJobId[anomaly.jobId].indexOf(anomaly.entityValue) === -1) {
          categoryIdsByJobId[anomaly.jobId].push(anomaly.entityValue);
        }
      });

      // const categoryJobIds = Object.keys(categoryIdsByJobId);
      // await Promise.all(
      //   categoryJobIds.map(async jobId => {
      //     const examplesByCategoryId = await getCategoryExamples(
      //       jobId,
      //       categoryIdsByJobId[jobId],
      //       maxExamples
      //     );
      //     if (tableData.examplesByJobId !== undefined) {
      //       tableData.examplesByJobId[jobId] = examplesByCategoryId;
      //     }
      //   })
      // );
    }
  }

  return tableData;
};
