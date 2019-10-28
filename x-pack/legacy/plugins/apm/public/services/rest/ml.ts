/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { HttpServiceBase } from 'kibana/public';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { getMlJobId, getMlPrefix } from '../../../common/ml_job_constants';
import { callApi } from './callApi';
import { ESFilter } from '../../../typings/elasticsearch';

interface MlResponseItem {
  id: string;
  success: boolean;
  error?: {
    msg: string;
    body: string;
    path: string;
    response: string;
    statusCode: number;
  };
}

interface StartedMLJobApiResponse {
  datafeeds: MlResponseItem[];
  jobs: MlResponseItem[];
}

const { core } = npStart;

export async function startMLJob({
  serviceName,
  transactionType,
  http
}: {
  serviceName: string;
  transactionType: string;
  http: HttpServiceBase;
}) {
  const indexPatternName = core.injectedMetadata.getInjectedVar(
    'apmTransactionIndices'
  );
  const groups = ['apm', serviceName.toLowerCase()];
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [TRANSACTION_TYPE]: transactionType } }
  ];
  groups.push(transactionType.toLowerCase());
  return callApi<StartedMLJobApiResponse>(http, {
    method: 'POST',
    pathname: `/api/ml/modules/setup/apm_transaction`,
    body: JSON.stringify({
      prefix: getMlPrefix(serviceName, transactionType),
      groups,
      indexPatternName,
      startDatafeed: true,
      query: {
        bool: {
          filter
        }
      }
    })
  });
}

// https://www.elastic.co/guide/en/elasticsearch/reference/6.5/ml-get-job.html
export interface MLJobApiResponse {
  count: number;
  jobs: Array<{
    job_id: string;
  }>;
}

export async function getHasMLJob({
  serviceName,
  transactionType,
  http
}: {
  serviceName: string;
  transactionType: string;
  http: HttpServiceBase;
}) {
  try {
    await callApi<MLJobApiResponse>(http, {
      method: 'GET',
      pathname: `/api/ml/anomaly_detectors/${getMlJobId(
        serviceName,
        transactionType
      )}`
    });
    return true;
  } catch (e) {
    return false;
  }
}
