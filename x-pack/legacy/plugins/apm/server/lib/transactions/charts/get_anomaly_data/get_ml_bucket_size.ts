/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMlIndex } from '../../../../../common/ml_job_constants';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

interface IOptions {
  serviceName: string;
  transactionType: string;
  setup: Setup & SetupTimeRange;
}

interface ESResponse {
  bucket_span: number;
}

export async function getMlBucketSize({
  serviceName,
  transactionType,
  setup
}: IOptions): Promise<number> {
  const { client, start, end } = setup;
  const params = {
    index: getMlIndex(serviceName, transactionType),
    body: {
      _source: 'bucket_span',
      size: 1,
      query: {
        bool: {
          filter: [
            { exists: { field: 'bucket_span' } },
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      }
    }
  };

  try {
    const resp = await client.search<ESResponse, typeof params>(params);
    return resp.hits.hits[0]?._source.bucket_span || 0;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return 0;
    }
    throw err;
  }
}
