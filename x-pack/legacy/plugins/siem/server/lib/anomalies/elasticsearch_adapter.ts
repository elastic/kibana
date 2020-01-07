/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { AnomaliesOverTimeData } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import { TermAggregation } from '../types';

import { AnomalyHit, AnomaliesAdapter, AnomaliesActionGroupData } from './types';
import { buildAnomaliesOverTimeQuery } from './query.anomalies_over_time.dsl';
import { MatrixOverTimeHistogramData } from '../../../public/graphql/types';

export class ElasticsearchAnomaliesAdapter implements AnomaliesAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAnomaliesOverTime(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<AnomaliesOverTimeData> {
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
      AnomaliesOverTimeByModule: getAnomaliesOverTimeByJobId(anomaliesOverTimeBucket),
      totalCount,
    };
  }
}

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
