/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import { MatrixHistogramOverTimeData, MatrixOverTimeHistogramData } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import {
  MatrixHistogramAdapter,
  AlertsGroupData,
  AlertsBucket,
  AnomaliesActionGroupData,
  AnomalyHit,
} from './types';
import { TermAggregation } from '../types';
import { EventHit } from '../events/types';
import { buildAlertsHistogramQuery } from './query_alerts.dsl';
import { buildAnomaliesOverTimeQuery } from './query.anomalies_over_time.dsl';
import { buildDnsHistogramQuery } from './query_dns_histogram.dsl';
import { buildEventsOverTimeQuery } from './query.events_over_time.dsl';
import { buildAuthenticationsOverTimeQuery } from './query.authentications_over_time.dsl';
import { AuthenticationHit } from '../authentications/types';

export class ElasticsearchMatrixHistogramAdapter implements MatrixHistogramAdapter {
  constructor(private readonly framework: FrameworkAdapter) { }

  public async getAlertsHistogramData(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const dsl = buildAlertsHistogramQuery(options);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const matrixHistogramData = getOr([], 'aggregations.alertsGroup.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      matrixHistogramData: getAlertsOverTimeByModule(matrixHistogramData),
      totalCount,
    };
  }

  public async getAnomaliesHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const dsl = buildAnomaliesOverTimeQuery(options);

    const response = await this.framework.callWithRequest<AnomalyHit, TermAggregation>(
      request,
      'search',
      dsl
    );

    const totalCount = getOr(0, 'hits.total.value', response);
    const anomaliesOverTimeBucket = getOr([], 'aggregations.anomalyActionGroup.buckets', response);

    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      matrixHistogramData: getAnomaliesOverTimeByJobId(anomaliesOverTimeBucket),
      totalCount,
    };
  }

  public async getAuthenticationsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const dsl = buildAuthenticationsOverTimeQuery(options);
    const response = await this.framework.callWithRequest<AuthenticationHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const authenticationsOverTimeBucket = getOr(
      [],
      'aggregations.eventActionGroup.buckets',
      response
    );
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      matrixHistogramData: getAuthenticationsOverTimeByAuthenticationResult(
        authenticationsOverTimeBucket
      ),
      totalCount,
    };
  }

  public async getDnsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const dsl = buildDnsHistogramQuery(options);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const matrixHistogramData = getOr([], 'aggregations.NetworkDns.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      matrixHistogramData: getHistogramData(matrixHistogramData),
      totalCount,
    };
  }

  public async getEventsHistogram(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const dsl = buildEventsOverTimeQuery(options);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const eventsOverTimeBucket = getOr([], 'aggregations.eventActionGroup.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      matrixHistogramData: getEventsOverTimeByActionName(eventsOverTimeBucket),
      totalCount,
    };
  }
}

// parsers

const getAlertsOverTimeByModule = (data: AlertsGroupData[]): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, alerts }) => {
    const alertsData: AlertsBucket[] = get('buckets', alerts);

    result = [
      ...result,
      ...alertsData.map(({ key, doc_count }: AlertsBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })),
    ];
  });

  return result;
};

const getAnomaliesOverTimeByJobId = (
  data: AnomaliesActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, anomalies }) => {
    const anomaliesData = getOr([], 'buckets', anomalies).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...anomaliesData];
  });

  return result;
};

const getAuthenticationsOverTimeByAuthenticationResult = (
  data: AuthenticationsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, events }) => {
    const eventsData = getOr([], 'buckets', events).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...eventsData];
  });

  return result;
};

const getHistogramData = (data: DnsHistogramGroupData[]): MatrixOverTimeHistogramData[] => {
  return data.reduce(
    (acc: MatrixOverTimeHistogramData[], { key: time, histogram: { buckets } }) => {
      const temp = buckets.map(({ key, doc_count }) => ({ x: time, y: doc_count, g: key }));
      return [...acc, ...temp];
    },
    []
  );
};

const getEventsOverTimeByActionName = (
  data: EventsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, events }) => {
    const eventsData = getOr([], 'buckets', events).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...eventsData];
  });

  return result;
};

export const getTotalEventsOverTime = (
  data: EventsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  return data && data.length > 0
    ? data.map<MatrixOverTimeHistogramData>(({ key, doc_count }) => ({
      x: key,
      y: doc_count,
      g: 'total events',
    }))
    : [];
};
