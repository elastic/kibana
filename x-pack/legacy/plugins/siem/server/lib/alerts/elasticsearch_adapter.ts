/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { AlertsOverTimeData, MatrixOverTimeHistogramData } from '../../graphql/types';

import { inspectStringifyObject } from '../../utils/build_query';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { buildAlertsHistogramQuery } from './query.dsl';

import { AlertsAdapter, AlertsGroupData } from './types';
import { TermAggregation } from '../types';
import { EventHit } from '../events/types';

export class ElasticsearchAlertsAdapter implements AlertsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAlertsHistogramData(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<AlertsOverTimeData> {
    const dsl = buildAlertsHistogramQuery(options);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const alertsOverTimeByModule = getOr([], 'aggregations.alertsByModuleGroup.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      alertsOverTimeByModule: getAlertsOverTimeByModule(alertsOverTimeByModule),
      totalCount,
    };
  }
}

const getAlertsOverTimeByModule = (data: AlertsGroupData[]): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, alerts }) => {
    const alertsData = getOr([], 'buckets', alerts).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...alertsData];
  });

  return result;
};
