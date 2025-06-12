/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import { TimelineKpiStrategyResponse } from '../../../../../../common/search_strategy/timeline';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { TimelineFactory } from '../../types';
import { buildTimelineKpiQuery } from './query.kpi.dsl';

export const timelineKpi: TimelineFactory<TimelineEventsQueries.kpi> = {
  buildDsl: (options) => {
    return buildTimelineKpiQuery(options);
  },
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineKpiStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineKpiQuery(options))],
    };

    return {
      ...response,
      destinationIpCount: getOr(0, 'aggregations.destinationIpCount.value', response.rawResponse),
      inspect,
      hostCount: getOr(0, 'aggregations.hostCount.value', response.rawResponse),
      processCount: getOr(0, 'aggregations.processCount.value', response.rawResponse),
      sourceIpCount: getOr(0, 'aggregations.sourceIpCount.value', response.rawResponse),
      userCount: getOr(0, 'aggregations.userCount.value', response.rawResponse),
    };
  },
};
