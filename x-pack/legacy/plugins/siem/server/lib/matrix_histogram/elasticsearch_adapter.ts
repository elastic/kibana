/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import {
  MatrixHistogramOverTimeData,
  MatrixOverTimeHistogramData,
  HistogramType,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import {
  MatrixHistogramAdapter,
  AlertsGroupData,
  AlertsBucket,
  AnomaliesActionGroupData,
  AnomalyHit,
  EventsActionGroupData,
  DnsHistogramBucket,
  DnsHistogramGroupData,
  DnsHistogramSubBucket,
  AuthenticationsActionGroupData,
} from './types';
import { TermAggregation } from '../types';
import { EventHit } from '../events/types';
import { buildAlertsHistogramQuery } from './query_alerts.dsl';
import { buildAnomaliesOverTimeQuery } from './query.anomalies_over_time.dsl';
import { buildDnsHistogramQuery } from './query_dns_histogram.dsl';
import { buildEventsOverTimeQuery } from './query.events_over_time.dsl';
import { buildAuthenticationsOverTimeQuery } from './query.authentications_over_time.dsl';
import { AuthenticationHit } from '../authentications/types';

interface MatrixHistogramSchema<T> {
  buildDsl: (options: MatrixHistogramRequestOptions) => {};
  aggName: string;
  parseKey: string;
  parser?: <T>(
    data: MatrixHistogramParseData<T>,
    keyBucket: string
  ) => MatrixOverTimeHistogramData[];
}

type MatrixHistogramParseData<T> = T extends HistogramType.alerts
  ? AlertsGroupData[]
  : T extends HistogramType.anomalies
  ? AnomaliesActionGroupData[]
  : T extends HistogramType.dns
  ? DnsHistogramGroupData[]
  : T extends HistogramType.authentications
  ? AuthenticationsActionGroupData[]
  : T extends HistogramType.events
  ? EventsActionGroupData[]
  : never;

type MatrixHistogramHit<T> = T extends HistogramType.alerts
  ? EventHit
  : T extends HistogramType.anomalies
  ? AnomalyHit
  : T extends HistogramType.dns
  ? EventHit
  : T extends HistogramType.authentications
  ? AuthenticationHit
  : T extends HistogramType.events
  ? EventHit
  : never;

type MatrixHistogramConfig = Record<HistogramType, MatrixHistogramSchema<HistogramType>>;

const getDnsParsedData = (
  data: MatrixHistogramParseData<HistogramType.dns>,
  keyBucket: string
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach((bucketData: DnsHistogramBucket) => {
    const time = get('key', bucketData);
    const histData = getOr([], keyBucket, bucketData).map(
      ({ key, doc_count }: DnsHistogramSubBucket) => ({
        x: time,
        y: doc_count,
        g: key,
      })
    );
    result = [...result, ...histData];
  });
  return result;
};

const getGenericData = <T>(
  data: MatrixHistogramParseData<T>,
  keyBucket: string
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach((bucketData: unknown) => {
    const group = get('key', bucketData);
    const histData = getOr([], keyBucket, bucketData).map(({ key, doc_count }: AlertsBucket) => ({
      x: key,
      y: doc_count,
      g: group,
    }));
    result = [...result, ...histData];
  });

  return result;
};

const matrixHistogramConfig: MatrixHistogramConfig = {
  [HistogramType.alerts]: {
    buildDsl: buildAlertsHistogramQuery,
    aggName: 'aggregations.alertsGroup.buckets',
    parseKey: 'alerts.buckets',
  },
  [HistogramType.anomalies]: {
    buildDsl: buildAnomaliesOverTimeQuery,
    aggName: 'aggregations.anomalyActionGroup.buckets',
    parseKey: 'anomalies.buckets',
  },
  [HistogramType.authentications]: {
    buildDsl: buildAuthenticationsOverTimeQuery,
    aggName: 'aggregations.eventActionGroup.buckets',
    parseKey: 'events.buckets',
  },
  [HistogramType.dns]: {
    buildDsl: buildDnsHistogramQuery,
    aggName: 'aggregations.NetworkDns.buckets',
    parseKey: 'dns.buckets',
    parser: getDnsParsedData,
  },
  [HistogramType.events]: {
    buildDsl: buildEventsOverTimeQuery,
    aggName: 'aggregations.eventActionGroup.buckets',
    parseKey: 'events.buckets',
  },
};

export class ElasticsearchMatrixHistogramAdapter implements MatrixHistogramAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getHistogramData(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    const dsl = myConfig.buildDsl(options);
    const response = await this.framework.callWithRequest<
      MatrixHistogramHit<HistogramType>,
      TermAggregation
    >(request, 'search', dsl);
    const totalCount = getOr(0, 'hits.total.value', response);
    const matrixHistogramData = getOr([], myConfig.aggName, response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      matrixHistogramData: myConfig.parser
        ? myConfig.parser<typeof options.histogramType>(matrixHistogramData, myConfig.parseKey)
        : getGenericData<typeof options.histogramType>(matrixHistogramData, myConfig.parseKey),
      totalCount,
    };
  }
}
