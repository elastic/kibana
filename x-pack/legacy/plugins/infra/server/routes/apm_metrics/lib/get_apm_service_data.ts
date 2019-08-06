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
  InfraApmMetricsTransactionType,
  APMChartResponse,
  InfraApmMetricsDataSet,
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
  service: InfraApmMetricsService,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
): Promise<InfraApmMetricsService> => {
  const getTransactionDataFor = async (type: InfraApmMetricsTransactionType) =>
    getDataForTransactionType(
      framework,
      req,
      sourceConfiguration,
      service,
      type,
      nodeId,
      nodeType,
      timeRange
    );
  const requestSeries = await getTransactionDataFor('request');
  const jobSeries = await getTransactionDataFor('job');
  return { ...service, dataSets: [...requestSeries, ...jobSeries] };
};

const getDataForTransactionType = async (
  framework: InfraBackendFrameworkAdapter,
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  service: InfraApmMetricsService,
  transactionType: InfraApmMetricsTransactionType,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
): Promise<InfraApmMetricsDataSet[]> => {
  const nodeField =
    nodeType === 'host' ? 'host.hostname' : getIdFieldName(sourceConfiguration, nodeType);
  const params = new URLSearchParams({
    start: moment(timeRange.min).toISOString(),
    end: moment(timeRange.max).toISOString(),
    transactionType,
    uiFilters: JSON.stringify({ kuery: `${nodeField}: "${nodeId}"` }),
  });
  const res = await framework.makeInternalRequest(
    req as InfraFrameworkRequest<Legacy.Request>,
    `/api/apm/services/${service.id}/transaction_groups/charts?${params.toString()}`,
    'GET'
  );
  if (res.statusCode !== 200) {
    throw res;
  }
  const result = APMChartResponseRT.decode(res.result).getOrElseL(
    throwErrors(message => Boom.badImplementation(`Request to APM Failed: ${message}`))
  );
  if (!hasTransactionData(result)) {
    return [] as InfraApmMetricsDataSet[];
  }
  const { responseTimes, tpmBuckets } = result.apmTimeseries;
  return [
    {
      id: 'transactionsPerMinute',
      type: transactionType,
      series: tpmBuckets.map(mapApmBucketToDataBucket),
    },
    {
      id: 'responseTimes',
      type: transactionType,
      series: [
        createApmBucket('avg', responseTimes.avg),
        createApmBucket('p95', responseTimes.p95),
        createApmBucket('p99', responseTimes.p99),
      ],
    },
  ];
};

const hasTransactionData = (result: APMChartResponse): boolean => {
  const { responseTimes, tpmBuckets } = result.apmTimeseries;
  const hasTPMData = tpmBuckets.length !== 0;
  const hasResponseTimes =
    responseTimes.avg.some(r => r.y) ||
    responseTimes.p95.some(r => r.y) ||
    responseTimes.p99.some(r => r.y);
  return hasTPMData || hasResponseTimes;
};

const createApmBucket = (id: string, data: APMDataPoint[]) => {
  return {
    id,
    data: data.map(p => ({ timestamp: p.x, value: p.y })),
  };
};

const mapApmBucketToDataBucket = (bucket: APMTpmBuckets) =>
  createApmBucket(bucket.key, bucket.dataPoints);
