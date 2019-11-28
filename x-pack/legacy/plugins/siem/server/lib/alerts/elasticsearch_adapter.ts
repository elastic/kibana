/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, get, cloneDeep, uniq, last } from 'lodash/fp';

import { AlertsData, TimelineEdges } from '../../graphql/types';

import { inspectStringifyObject } from '../../utils/build_query';

import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { buildAlertsQuery } from './query.dsl';

import { AlertsAdapter } from './types';
import { SearchHit } from '../types';
import { TimelineRequestOptions } from '../events/types';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { eventFieldsMap } from '../ecs_fields';
import { formatTimelineData } from '../events';
export class ElasticsearchAlertsAdapter implements AlertsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

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
}
