/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Legacy } from 'kibana';
import Boom from 'boom';
import { throwErrors } from '../../../../common/runtime_types';
import { InfraNodeType } from '../../../../common/http_api/common';
import { getIdFieldName } from '../../metadata/lib/get_id_field_name';
import {
  InfraApmMetricsService,
  APMChartResponseRT,
  APMDataPoint,
  APMTpmBuckets,
} from '../../../../common/http_api';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';

export const getApmServiceData = async (
  framework: InfraBackendFrameworkAdapter,
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  service: string,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
): Promise<InfraApmMetricsService> => {
  const nodeField = getIdFieldName(sourceConfiguration, nodeType);
  const params = new URLSearchParams({
    start: moment(timeRange.min).toISOString(),
    end: moment(timeRange.max).toISOString(),
    transactionType: 'request',
    uiFilters: JSON.stringify({ kuery: `${nodeField}: "${nodeId}"` }),
  });
  const res = await framework.makeInternalRequest(
    req as InfraFrameworkRequest<Legacy.Request>,
    `/api/apm/services/${service}/transaction_groups/charts?${params.toString()}`,
    'GET'
  );
  if (res.statusCode !== 200) {
    throw res;
  }
  const result = APMChartResponseRT.decode(res.result).getOrElseL(
    throwErrors(message => Boom.badImplementation(`Request to APM Failed: ${message}`))
  );
  const { responseTimes, tpmBuckets } = result.apmTimeseries;
  return {
    name: service,
    transactionsPerMinute: tpmBuckets.map(mapApmBucketToDataBucket),
    responseTimes: [
      createApmBucket('avg', responseTimes.avg),
      createApmBucket('p95', responseTimes.p95),
      createApmBucket('p99', responseTimes.p99),
    ],
  };
};

const createApmBucket = (name: string, data: APMDataPoint[]) => {
  return {
    name,
    data: data.map(p => ({ timestamp: p.x, value: p.y })),
  };
};

const mapApmBucketToDataBucket = (bucket: APMTpmBuckets) =>
  createApmBucket(bucket.key, bucket.dataPoints);
