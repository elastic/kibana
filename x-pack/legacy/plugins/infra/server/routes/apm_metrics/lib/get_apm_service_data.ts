/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Legacy } from 'kibana';
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { get } from 'lodash';
import { throwErrors } from '../../../../common/runtime_types';
import { InfraNodeType } from '../../../../common/http_api/common';
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
  InfraFrameworkRequest,
  internalInfraFrameworkRequest,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { getApmFieldName } from '../../../../common/utils/get_apm_field_name';

export const getApmServiceData = async (
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  service: InfraApmMetricsService,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
): Promise<InfraApmMetricsService> => {
  const getTransactionDataFor = async (type: InfraApmMetricsTransactionType) =>
    getDataForTransactionType(req, sourceConfiguration, service, type, nodeId, nodeType, timeRange);
  const requestSeries = await getTransactionDataFor('request');
  const jobSeries = await getTransactionDataFor('job');
  return { ...service, dataSets: [...requestSeries, ...jobSeries] };
};

const getDataForTransactionType = async (
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  service: InfraApmMetricsService,
  transactionType: InfraApmMetricsTransactionType,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
): Promise<InfraApmMetricsDataSet[]> => {
  const nodeField = getApmFieldName(sourceConfiguration, nodeType);
  const query = {
    start: moment(timeRange.min).toISOString(),
    end: moment(timeRange.max).toISOString(),
    transactionType,
    uiFilters: JSON.stringify({ kuery: `${nodeField}: "${nodeId}"` }),
  };
  const params = new URLSearchParams(query);
  const internalRequest = req[internalInfraFrameworkRequest];

  const getTransactionGroupsCharts = get(
    internalRequest,
    'server.plugins.apm.getTransactionGroupsCharts'
  ) as (
    req: Legacy.Request,
    params: {
      query: {
        start: string;
        end: string;
        uiFilters: string;
        transactionType?: string;
        transactionName?: string;
      };
      path: { serviceName: string };
    }
  ) => any;
  if (!getTransactionGroupsCharts) {
    throw new Error('APM is not available');
  }
  const newRequest = Object.assign(
    Object.create(Object.getPrototypeOf(internalRequest)),
    internalRequest,
    {
      url: `/api/apm/services/${service.id}/transaction_groups/charts?${params.toString()}`,
      method: 'GET',
      query,
      path: {
        serviceName: service.id,
      },
    }
  );
  const response = await getTransactionGroupsCharts(newRequest, {
    query,
    path: { serviceName: service.id },
  });

  const result = pipe(
    APMChartResponseRT.decode(response),
    fold(
      throwErrors(message => Boom.badImplementation(`Request to APM Failed: ${message}`)),
      identity
    )
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
