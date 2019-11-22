/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMlIndex } from '../../../../../common/ml_job_constants';
import { PromiseReturnType } from '../../../../../typings/common';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

export type ESResponse = Exclude<
  PromiseReturnType<typeof anomalySeriesFetcher>,
  undefined
>;

export async function anomalySeriesFetcher({
  serviceName,
  transactionType,
  intervalString,
  mlBucketSize,
  setup
}: {
  serviceName: string;
  transactionType: string;
  intervalString: string;
  mlBucketSize: number;
  setup: Setup & SetupTimeRange;
}) {
  const { client, start, end } = setup;

  // move the start back with one bucket size, to ensure to get anomaly data in the beginning
  // this is required because ML has a minimum bucket size (default is 900s) so if our buckets are smaller, we might have several null buckets in the beginning
  const newStart = start - mlBucketSize * 1000;

  const params = {
    index: getMlIndex(serviceName, transactionType),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { exists: { field: 'bucket_span' } },
            {
              range: {
                timestamp: {
                  gte: newStart,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      aggs: {
        ml_avg_response_times: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: {
              min: newStart,
              max: end
            }
          },
          aggs: {
            anomaly_score: { max: { field: 'anomaly_score' } },
            lower: { min: { field: 'model_lower' } },
            upper: { max: { field: 'model_upper' } }
          }
        }
      }
    }
  };

  try {
    const response = await client.search(params);
    return response;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return;
    }
    throw err;
  }
}
