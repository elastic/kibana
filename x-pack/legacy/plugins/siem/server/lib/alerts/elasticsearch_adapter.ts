/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import { AlertsOverTimeData, MatrixOverTimeHistogramData } from '../../graphql/types';

import { inspectStringifyObject } from '../../utils/build_query';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { buildAlertsHistogramQuery } from './query.dsl';

import { AlertsAdapter, AlertsGroupData, AlertsBucket } from './types';
import { TermAggregation } from '../types';
import { EventHit } from '../events/types';

export class ElasticsearchAlertsAdapter implements AlertsAdapter {
  constructor(private readonly framework: FrameworkAdapter) { }

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
    const AlertsOverTimeByModule = getOr([], 'aggregations.alertsByModuleGroup.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      AlertsOverTimeByModule: getAlertsOverTimeByModule(AlertsOverTimeByModule),
      totalCount,
    };
  }
}

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
