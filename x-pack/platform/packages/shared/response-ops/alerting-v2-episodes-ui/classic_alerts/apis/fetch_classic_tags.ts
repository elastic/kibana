/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { ALERT_RULE_TAGS } from '@kbn/rule-data-utils';
import { buildClassicAlertsQuery } from '../utils/query';
import { CLASSIC_ALERTS_TAGS_LIMIT } from '../constants';
import {
  type BaseRacOptions,
  type ClassicTagsAggregations,
  findClassicAlerts,
  toTimeRangeParam,
} from './rac_find';

export interface FetchClassicAlertsTagsOptions extends BaseRacOptions {
  timeRange?: TimeRange | null;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

export const buildClassicAlertsTagsAggs = (
  size: number
): Record<string, estypes.AggregationsAggregationContainer> => ({
  tags: {
    terms: { field: ALERT_RULE_TAGS, size },
  },
});

/** Returns distinct classic alert rule tags (RBAC enforced by the RAC alerts API). */
export const fetchClassicAlertsTags = async ({
  ruleTypeIds,
  timeRange,
  abortSignal,
  services: { http },
}: FetchClassicAlertsTagsOptions): Promise<string[]> => {
  const response = await findClassicAlerts<ClassicTagsAggregations>(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: buildClassicAlertsQuery(undefined, toTimeRangeParam(timeRange)),
      aggs: buildClassicAlertsTagsAggs(CLASSIC_ALERTS_TAGS_LIMIT),
      size: 0,
      track_total_hits: false,
      _source: false,
    },
    abortSignal
  );

  const buckets = response.aggregations?.tags.buckets;
  if (!Array.isArray(buckets)) {
    return [];
  }

  return buckets
    .map((bucket) => bucket.key)
    .filter((key): key is string => typeof key === 'string');
};
