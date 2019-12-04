/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, get, cloneDeep, uniq, last } from 'lodash/fp';

import {
  AlertsData,
  AlertsOverTimeData,
  TimelineEdges,
  MatrixOverOrdinalHistogramData,
} from '../../graphql/types';

import { inspectStringifyObject } from '../../utils/build_query';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { buildAlertsQuery, buildAlertsHistogramQuery } from './query.dsl';

import { AlertsAdapter, AlertsGroupData } from './types';
import { SearchHit, TermAggregation } from '../types';
import { TimelineRequestOptions, EventHit } from '../events/types';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { eventFieldsMap } from '../ecs_fields';
import { formatTimelineData } from '../events';
export class ElasticsearchAlertsAdapter implements AlertsAdapter {
  constructor(private readonly framework: FrameworkAdapter) { }

  public async getAlertsData(
    request: FrameworkRequest,
    options: TimelineRequestOptions
  ): Promise<AlertsData> {
    const queryOptions = cloneDeep(options);
    queryOptions.fields = uniq([
      ...queryOptions.fieldRequested,
      ...reduceFields(queryOptions.fields, eventFieldsMap),
    ]);
    delete queryOptions.fieldRequested;
    const dsl = buildAlertsQuery(queryOptions);
    const response = await this.framework.callWithRequest<SearchHit>(request, 'search', dsl);
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'hits.total.value', response);
    const hits = response.hits.hits;

    const timelineEdges: TimelineEdges[] = hits.map(hit =>
      formatTimelineData(options.fieldRequested, options.fields, hit, eventFieldsMap)
    );

    const hasNextPage = timelineEdges.length === limit + 1;
    const edges = hasNextPage ? timelineEdges.splice(0, limit) : timelineEdges;
    const lastCursor = get('cursor', last(edges));
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return { edges, inspect, pageInfo: { hasNextPage, endCursor: lastCursor }, totalCount };
  }

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

const getAlertsOverTimeByModule = (data: AlertsGroupData[]): MatrixOverOrdinalHistogramData[] => {
  let result: MatrixOverOrdinalHistogramData[] = [];
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
